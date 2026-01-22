import withAuthRequired from "@/shared/lib/auth/withAuthRequired";
import { db } from "@/db";
import { monthlyAllocations, budgetMembers, categories, groups, transactions, incomeSources, monthlyIncomeAllocations, monthlyBudgetStatus, recurringBills, financialAccounts } from "@/db/schema";
import { eq, and, inArray, sql, gte, lte } from "drizzle-orm";
import { ensurePendingTransactionsForMonth } from "@/shared/lib/budget/pending-transactions";
import { getUserBudgetIds, getUserMemberIdInBudget } from "@/shared/lib/api/permissions";
import {
  validationError,
  forbiddenError,
  successResponse,
  errorResponse,
} from "@/shared/lib/api/responses";
import { upsertAllocationSchema } from "@/shared/lib/validations";

// GET - Get allocations for a specific month with spending data
export const GET = withAuthRequired(async (req, context) => {
  const { session } = context;
  const { searchParams } = new URL(req.url);
  const budgetId = searchParams.get("budgetId");
  const year = parseInt(searchParams.get("year") || new Date().getFullYear().toString());
  const month = parseInt(searchParams.get("month") || (new Date().getMonth() + 1).toString());

  if (!budgetId) {
    return errorResponse("budgetId is required", 400);
  }

  const budgetIds = await getUserBudgetIds(session.user.id);
  if (!budgetIds.includes(budgetId)) {
    return forbiddenError("Budget not found or access denied");
  }

  // Lazy generation: ensure pending transactions exist for this month
  // This is idempotent - it only creates transactions that don't exist yet
  await ensurePendingTransactionsForMonth(budgetId, year, month);

  // Get user's member ID for visibility filtering
  const userMemberId = await getUserMemberIdInBudget(session.user.id, budgetId);

  // Calculate date range for this month
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59);

  // PERFORMANCE: Run independent queries in parallel
  const [budgetCategories, allocations, spending, bills] = await Promise.all([
    // Get all categories with their groups
    db
      .select({
        category: categories,
        group: groups,
      })
      .from(categories)
      .innerJoin(groups, eq(categories.groupId, groups.id))
      .where(
        and(
          eq(categories.budgetId, budgetId),
          eq(categories.isArchived, false)
        )
      )
      .orderBy(groups.displayOrder, categories.displayOrder),

    // Get allocations for this month
    db
      .select()
      .from(monthlyAllocations)
      .where(
        and(
          eq(monthlyAllocations.budgetId, budgetId),
          eq(monthlyAllocations.year, year),
          eq(monthlyAllocations.month, month)
        )
      ),

    // Get spending per category for this month
    db
      .select({
        categoryId: transactions.categoryId,
        totalSpent: sql<number>`SUM(CASE WHEN ${transactions.type} = 'expense' THEN ${transactions.amount} ELSE 0 END)`,
      })
      .from(transactions)
      .where(
        and(
          eq(transactions.budgetId, budgetId),
          gte(transactions.date, startDate),
          lte(transactions.date, endDate),
          inArray(transactions.status, ["pending", "cleared", "reconciled"])
        )
      )
      .groupBy(transactions.categoryId),

    // Get recurring bills with account info
    db
      .select({
        bill: recurringBills,
        account: {
          id: financialAccounts.id,
          name: financialAccounts.name,
          icon: financialAccounts.icon,
        },
      })
      .from(recurringBills)
      .leftJoin(financialAccounts, eq(recurringBills.accountId, financialAccounts.id))
      .where(
        and(
          eq(recurringBills.budgetId, budgetId),
          eq(recurringBills.isActive, true)
        )
      )
      .orderBy(recurringBills.displayOrder),
  ]);

  const spendingMap = new Map(spending.map((s) => [s.categoryId, Number(s.totalSpent) || 0]));
  const allocationsMap = new Map(allocations.map((a) => [a.categoryId, a]));

  // Calculate carriedOver from previous month
  const prevMonth = month === 1 ? 12 : month - 1;
  const prevYear = month === 1 ? year - 1 : year;

  const prevMonthAllocationsList = await db
    .select()
    .from(monthlyAllocations)
    .where(
      and(
        eq(monthlyAllocations.budgetId, budgetId),
        eq(monthlyAllocations.year, prevYear),
        eq(monthlyAllocations.month, prevMonth)
      )
    );

  const hasPreviousMonthData = prevMonthAllocationsList.length > 0;

  if (hasPreviousMonthData) {
    // Calculate date range for previous month
    const prevStartDate = new Date(prevYear, prevMonth - 1, 1);
    const prevEndDate = new Date(prevYear, prevMonth, 0, 23, 59, 59);

    // Get spending per category for previous month
    const prevSpending = await db
      .select({
        categoryId: transactions.categoryId,
        totalSpent: sql<number>`SUM(CASE WHEN ${transactions.type} = 'expense' THEN ${transactions.amount} ELSE 0 END)`,
      })
      .from(transactions)
      .where(
        and(
          eq(transactions.budgetId, budgetId),
          gte(transactions.date, prevStartDate),
          lte(transactions.date, prevEndDate),
          inArray(transactions.status, ["cleared", "reconciled"]) // Only count confirmed expenses
        )
      )
      .groupBy(transactions.categoryId);

    const prevSpendingMap = new Map(prevSpending.map((s) => [s.categoryId, Number(s.totalSpent) || 0]));

    // Calculate carriedOver for each category
    for (const prevAlloc of prevMonthAllocationsList) {
      const prevSpent = prevSpendingMap.get(prevAlloc.categoryId) || 0;
      const prevAvailable = (prevAlloc.allocated || 0) + (prevAlloc.carriedOver || 0) - prevSpent;

      // Only carry over positive amounts (surplus), not negative (overspent)
      const carryOver = Math.max(0, prevAvailable);

      // Find or create current month allocation
      const currentAlloc = allocationsMap.get(prevAlloc.categoryId);

      if (currentAlloc) {
        // Update if carriedOver is different
        if (currentAlloc.carriedOver !== carryOver) {
          await db
            .update(monthlyAllocations)
            .set({ carriedOver: carryOver, updatedAt: new Date() })
            .where(eq(monthlyAllocations.id, currentAlloc.id));

          // Update local map for this request
          currentAlloc.carriedOver = carryOver;
        }
      } else if (carryOver > 0) {
        // Create new allocation with carriedOver (only if there's something to carry)
        const [newAlloc] = await db
          .insert(monthlyAllocations)
          .values({
            budgetId,
            categoryId: prevAlloc.categoryId,
            year,
            month,
            allocated: 0,
            carriedOver: carryOver,
          })
          .returning();

        allocationsMap.set(prevAlloc.categoryId, newAlloc);
      }
    }
  }

  // Group bills by categoryId
  const billsMap = new Map<string, Array<{
    id: string;
    name: string;
    amount: number;
    frequency: string;
    dueDay: number | null;
    dueMonth: number | null;
    isAutoDebit: boolean;
    isVariable: boolean;
    account: { id: string; name: string; icon: string | null } | null;
  }>>();

  for (const { bill, account } of bills) {
    if (!billsMap.has(bill.categoryId)) {
      billsMap.set(bill.categoryId, []);
    }
    billsMap.get(bill.categoryId)!.push({
      id: bill.id,
      name: bill.name,
      amount: bill.amount,
      frequency: bill.frequency,
      dueDay: bill.dueDay,
      dueMonth: bill.dueMonth,
      isAutoDebit: bill.isAutoDebit ?? false,
      isVariable: bill.isVariable ?? false,
      account: account?.id ? { id: account.id, name: account.name, icon: account.icon } : null,
    });
  }

  // Type for recurring bills in category
  type RecurringBillSummary = {
    id: string;
    name: string;
    amount: number;
    frequency: string;
    dueDay: number | null;
    dueMonth: number | null;
    isAutoDebit: boolean;
    isVariable: boolean;
    account: { id: string; name: string; icon: string | null } | null;
  };

  // Group categories by group
  const groupedData = new Map<string, {
    group: typeof groups.$inferSelect;
    categories: Array<{
      category: typeof categories.$inferSelect;
      allocated: number;
      carriedOver: number;
      spent: number;
      available: number;
      isOtherMemberCategory: boolean; // True if category belongs to another member
      recurringBills: RecurringBillSummary[]; // Recurring bills for this category
    }>;
    totals: { allocated: number; spent: number; available: number };
  }>();

  for (const { category, group } of budgetCategories) {
    if (!groupedData.has(group.id)) {
      groupedData.set(group.id, {
        group,
        categories: [],
        totals: { allocated: 0, spent: 0, available: 0 },
      });
    }

    const allocation = allocationsMap.get(category.id);
    const categoryBills = billsMap.get(category.id) || [];

    // If category has recurring bills, sum their amounts as the allocated value
    const billsTotal = categoryBills.reduce((sum, bill) => sum + bill.amount, 0);
    const allocated = categoryBills.length > 0
      ? billsTotal
      : (allocation?.allocated || category.plannedAmount || 0);
    const carriedOver = allocation?.carriedOver || 0;
    const spent = spendingMap.get(category.id) || 0;
    const available = allocated + carriedOver - spent;

    // Check if this category belongs to another member (not the current user)
    const isOtherMemberCategory = category.memberId !== null && category.memberId !== userMemberId;

    const groupData = groupedData.get(group.id)!;
    groupData.categories.push({
      category,
      allocated,
      carriedOver,
      spent,
      available,
      isOtherMemberCategory,
      recurringBills: categoryBills,
    });
    groupData.totals.allocated += allocated + carriedOver;
    groupData.totals.spent += spent;
    groupData.totals.available += available;
  }

  // Calculate overall totals
  const overallTotals = {
    allocated: 0,
    spent: 0,
    available: 0,
  };

  const groupedResult = Array.from(groupedData.values())
    .sort((a, b) => a.group.displayOrder - b.group.displayOrder)
    .map((g) => {
      overallTotals.allocated += g.totals.allocated;
      overallTotals.spent += g.totals.spent;
      overallTotals.available += g.totals.available;
      return g;
    });

  // PERFORMANCE: Run income-related queries in parallel
  const [budgetIncomeSources, incomeAllocations, incomeReceived] = await Promise.all([
    // Get income sources with member data
    db
      .select({
        incomeSource: incomeSources,
        member: budgetMembers,
      })
      .from(incomeSources)
      .leftJoin(budgetMembers, eq(incomeSources.memberId, budgetMembers.id))
      .where(
        and(
          eq(incomeSources.budgetId, budgetId),
          eq(incomeSources.isActive, true)
        )
      )
      .orderBy(incomeSources.displayOrder),

    // Get monthly income allocations (overrides for this month)
    db
      .select()
      .from(monthlyIncomeAllocations)
      .where(
        and(
          eq(monthlyIncomeAllocations.budgetId, budgetId),
          eq(monthlyIncomeAllocations.year, year),
          eq(monthlyIncomeAllocations.month, month)
        )
      ),

    // Get income received per income source for this month
    db
      .select({
        incomeSourceId: transactions.incomeSourceId,
        totalReceived: sql<number>`SUM(${transactions.amount})`,
      })
      .from(transactions)
      .where(
        and(
          eq(transactions.budgetId, budgetId),
          eq(transactions.type, "income"),
          gte(transactions.date, startDate),
          lte(transactions.date, endDate),
          inArray(transactions.status, ["pending", "cleared", "reconciled"])
        )
      )
      .groupBy(transactions.incomeSourceId),
  ]);

  const incomeAllocationsMap = new Map(
    incomeAllocations.map((a) => [a.incomeSourceId, a.planned])
  );

  const incomeReceivedMap = new Map(
    incomeReceived.map((i) => [i.incomeSourceId, Number(i.totalReceived) || 0])
  );

  // Group income sources by member
  const incomeByMember = new Map<string | null, {
    member: typeof budgetMembers.$inferSelect | null;
    sources: Array<{
      incomeSource: typeof incomeSources.$inferSelect;
      planned: number;
      defaultAmount: number;
      received: number;
    }>;
    totals: { planned: number; received: number };
  }>();

  for (const { incomeSource, member } of budgetIncomeSources) {
    const memberId = incomeSource.memberId;

    if (!incomeByMember.has(memberId)) {
      incomeByMember.set(memberId, {
        member,
        sources: [],
        totals: { planned: 0, received: 0 },
      });
    }

    // Calculate monthly amount based on frequency
    // Weekly = 4x per month, Biweekly = 2x per month, Monthly = 1x per month
    const frequencyMultiplier =
      incomeSource.frequency === "weekly" ? 4 :
      incomeSource.frequency === "biweekly" ? 2 : 1;
    const defaultMonthlyAmount = (incomeSource.amount || 0) * frequencyMultiplier;

    // Use monthly allocation if it exists, otherwise use calculated monthly amount
    const planned = incomeAllocationsMap.has(incomeSource.id)
      ? incomeAllocationsMap.get(incomeSource.id)!
      : defaultMonthlyAmount;
    const received = incomeReceivedMap.get(incomeSource.id) || 0;

    const memberData = incomeByMember.get(memberId)!;
    memberData.sources.push({
      incomeSource,
      planned,
      defaultAmount: defaultMonthlyAmount, // Monthly amount considering frequency
      received,
    });
    memberData.totals.planned += planned;
    memberData.totals.received += received;
  }

  // Calculate total income from income sources
  const incomeTotals = {
    planned: 0,
    received: 0,
  };

  const incomeGroups = Array.from(incomeByMember.values()).map((g) => {
    incomeTotals.planned += g.totals.planned;
    incomeTotals.received += g.totals.received;
    return g;
  });

  // Get total income/expense from ALL transactions (even without incomeSourceId or categoryId)
  // Separate confirmed (cleared/reconciled) from pending for accurate reporting
  const [transactionTotals] = await db
    .select({
      // Confirmed totals (cleared or reconciled only)
      confirmedIncome: sql<number>`COALESCE(SUM(CASE WHEN ${transactions.type} = 'income' AND ${transactions.status} IN ('cleared', 'reconciled') THEN ${transactions.amount} ELSE 0 END), 0)`,
      confirmedExpense: sql<number>`COALESCE(SUM(CASE WHEN ${transactions.type} = 'expense' AND ${transactions.status} IN ('cleared', 'reconciled') THEN ${transactions.amount} ELSE 0 END), 0)`,
      // Total (including pending)
      totalIncome: sql<number>`COALESCE(SUM(CASE WHEN ${transactions.type} = 'income' THEN ${transactions.amount} ELSE 0 END), 0)`,
      totalExpense: sql<number>`COALESCE(SUM(CASE WHEN ${transactions.type} = 'expense' THEN ${transactions.amount} ELSE 0 END), 0)`,
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.budgetId, budgetId),
        gte(transactions.date, startDate),
        lte(transactions.date, endDate),
        inArray(transactions.status, ["pending", "cleared", "reconciled"])
      )
    );

  // Confirmed = only cleared/reconciled transactions
  const confirmedIncome = Number(transactionTotals?.confirmedIncome) || 0;
  const confirmedExpense = Number(transactionTotals?.confirmedExpense) || 0;
  // Total = all transactions including pending
  const totalIncome = Number(transactionTotals?.totalIncome) || 0;
  const totalExpense = Number(transactionTotals?.totalExpense) || 0;

  // Get month status
  const [monthStatus] = await db
    .select()
    .from(monthlyBudgetStatus)
    .where(
      and(
        eq(monthlyBudgetStatus.budgetId, budgetId),
        eq(monthlyBudgetStatus.year, year),
        eq(monthlyBudgetStatus.month, month)
      )
    )
    .limit(1);

  return successResponse({
    year,
    month,
    monthStatus: monthStatus?.status || "planning",
    monthStartedAt: monthStatus?.startedAt || null,
    hasPreviousMonthData,
    groups: groupedResult,
    totals: {
      ...overallTotals,
      // Confirmed expenses (cleared/reconciled only)
      spent: confirmedExpense,
      // Total expenses including pending
      totalSpent: totalExpense,
    },
    income: {
      byMember: incomeGroups,
      totals: {
        ...incomeTotals,
        // Confirmed income (cleared/reconciled only)
        received: confirmedIncome,
        // Total income including pending
        totalReceived: totalIncome,
      },
    },
  });
});

// POST - Upsert an allocation
export const POST = withAuthRequired(async (req, context) => {
  const { session } = context;
  const body = await req.json();

  const validation = upsertAllocationSchema.safeParse(body);
  if (!validation.success) {
    return validationError(validation.error);
  }

  const { budgetId, categoryId, year, month, allocated } = validation.data;

  // Check user has access to budget
  const budgetIds = await getUserBudgetIds(session.user.id);
  if (!budgetIds.includes(budgetId)) {
    return forbiddenError("Budget not found or access denied");
  }

  // Verify category belongs to budget
  const [category] = await db
    .select()
    .from(categories)
    .where(
      and(
        eq(categories.id, categoryId),
        eq(categories.budgetId, budgetId)
      )
    );

  if (!category) {
    return errorResponse("Category not found", 404);
  }

  // Upsert allocation
  const [existingAllocation] = await db
    .select()
    .from(monthlyAllocations)
    .where(
      and(
        eq(monthlyAllocations.budgetId, budgetId),
        eq(monthlyAllocations.categoryId, categoryId),
        eq(monthlyAllocations.year, year),
        eq(monthlyAllocations.month, month)
      )
    );

  let result;
  if (existingAllocation) {
    [result] = await db
      .update(monthlyAllocations)
      .set({
        allocated,
        updatedAt: new Date(),
      })
      .where(eq(monthlyAllocations.id, existingAllocation.id))
      .returning();
  } else {
    [result] = await db
      .insert(monthlyAllocations)
      .values({
        budgetId,
        categoryId,
        year,
        month,
        allocated,
        carriedOver: 0,
      })
      .returning();
  }

  return successResponse({ allocation: result }, existingAllocation ? 200 : 201);
});
