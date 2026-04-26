import withAuthRequired from "@/shared/lib/auth/withAuthRequired";
import { requireActiveSubscription } from "@/shared/lib/auth/withSubscriptionRequired";
import { db } from "@/db";
import { monthlyAllocations, monthlyGroupAllocations, budgetMembers, categories, groups, transactions, incomeSources, monthlyIncomeAllocations, monthlyBudgetStatus, recurringBills, financialAccounts, budgets } from "@/db/schema";
import { eq, and, inArray, sql, gte, lte, or, isNull } from "drizzle-orm";
import { ensurePendingTransactionsForMonth, autoActivateMonth } from "@/shared/lib/budget/pending-transactions";
import { getUserBudgetIds, getUserMemberIdInBudget, getPartnerPrivacyLevel } from "@/shared/lib/api/permissions";
import {
  validationError,
  forbiddenError,
  successResponse,
  errorResponse,
} from "@/shared/lib/api/responses";
import { upsertAllocationSchema, upsertGroupAllocationSchema } from "@/shared/lib/validations";
import { parseViewMode, getViewModeCondition } from "@/shared/lib/api/view-mode-filter";

/**
 * Count how many times a given weekday (0=Sun..6=Sat) occurs in a calendar month.
 * Used to compute realistic monthly multipliers for weekly income/expenses.
 */
function countWeekdayOccurrences(year: number, month: number, weekday: number): number {
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  let count = 0;
  for (let day = 1; day <= lastDay; day++) {
    if (new Date(Date.UTC(year, month - 1, day)).getUTCDay() === weekday) count++;
  }
  return count;
}

// GET - Get allocations for a specific month with spending data
export const GET = withAuthRequired(async (req, context) => {
  const { session } = context;
  const { searchParams } = new URL(req.url);
  const budgetId = searchParams.get("budgetId");
  const year = parseInt(searchParams.get("year") || new Date().getFullYear().toString());
  const month = parseInt(searchParams.get("month") || (new Date().getMonth() + 1).toString());
  const viewMode = parseViewMode(searchParams);

  if (!budgetId) {
    return errorResponse("budgetId is required", 400);
  }

  const budgetIds = await getUserBudgetIds(session.user.id);
  if (!budgetIds.includes(budgetId)) {
    return forbiddenError("Budget not found or access denied");
  }

  // Lazy generation: ensure pending transactions exist and auto-activate current month
  await ensurePendingTransactionsForMonth(budgetId, year, month);
  await autoActivateMonth(budgetId, year, month);

  // Get user's member ID and budget privacy mode for visibility filtering
  const userMemberId = await getUserMemberIdInBudget(session.user.id, budgetId);
  const [budgetRow] = await db
    .select({ privacyMode: budgets.privacyMode })
    .from(budgets)
    .where(eq(budgets.id, budgetId))
    .limit(1);
  const privacyMode = budgetRow?.privacyMode || "visible";

  // Get partner privacy level for "all" view mode
  const partnerPrivacy = viewMode === "all" && userMemberId
    ? await getPartnerPrivacyLevel(session.user.id, budgetId)
    : undefined;

  // Build category visibility condition based on viewMode
  // Categories with NULL memberId are shared — visible in "mine" view
  const categoryViewCondition = userMemberId
    ? getViewModeCondition({
        viewMode,
        userMemberId,
        ownerField: categories.memberId,
        partnerPrivacy,
        includeSharedInMine: true,
      })
    : undefined;

  // Build transaction visibility condition for spending queries.
  // Note: NOT using isTransactionFilter here — in unified mode, spending totals
  // per category should include ALL transactions (partner's too) for accurate budgeting.
  // Only the transaction LIST endpoint hides individual partner transactions.
  // We do pass paidByField so that, in "mine" view with all_visible privacy,
  // expenses paid by the current user for someone else's category still count
  // for them — keeping per-category totals consistent with the transaction list.
  const txViewCondition = userMemberId
    ? getViewModeCondition({
        viewMode,
        userMemberId,
        ownerField: transactions.memberId,
        partnerPrivacy,
        paidByField: transactions.paidByMemberId,
      })
    : undefined;

  // Calculate date range for this month
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59);

  // PERFORMANCE: Run independent queries in parallel
  const [budgetCategories, allocations, spending, bills, groupAllocations] = await Promise.all([
    // Get categories with their groups (filtered by viewMode)
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
          eq(categories.isArchived, false),
          ...(categoryViewCondition ? [categoryViewCondition] : [])
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

    // Get spending per category for this month split by status
    db
      .select({
        categoryId: transactions.categoryId,
        pendingSpent: sql<number>`SUM(CASE WHEN ${transactions.type} = 'expense' AND ${transactions.status} = 'pending' THEN ${transactions.amount} ELSE 0 END)`,
        confirmedSpent: sql<number>`SUM(CASE WHEN ${transactions.type} = 'expense' AND ${transactions.status} IN ('cleared', 'reconciled') THEN ${transactions.amount} ELSE 0 END)`,
      })
      .from(transactions)
      .where(
        and(
          eq(transactions.budgetId, budgetId),
          gte(transactions.date, startDate),
          lte(transactions.date, endDate),
          inArray(transactions.status, ["pending", "cleared", "reconciled"]),
          ...(txViewCondition ? [txViewCondition] : [])
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
          eq(recurringBills.isActive, true),
          or(isNull(recurringBills.startDate), lte(recurringBills.startDate, endDate)),
          or(isNull(recurringBills.endDate), gte(recurringBills.endDate, startDate))
        )
      )
      .orderBy(recurringBills.displayOrder),

    // Get group allocations (ceilings) for this month
    db
      .select()
      .from(monthlyGroupAllocations)
      .where(
        and(
          eq(monthlyGroupAllocations.budgetId, budgetId),
          eq(monthlyGroupAllocations.year, year),
          eq(monthlyGroupAllocations.month, month)
        )
      ),
  ]);

  const spendingMap = new Map(
    spending.map((s) => [
      s.categoryId,
      {
        pending: Number(s.pendingSpent) || 0,
        confirmed: Number(s.confirmedSpent) || 0,
      },
    ])
  );
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

    // Get spending per category for previous month.
    // We include pending so the carry-over matches the saldo shown on the
    // previous month's screen (which subtracts both pending and confirmed).
    // Without this, the SSR initial render and the API refetch could diverge.
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
          inArray(transactions.status, ["pending", "cleared", "reconciled"])
        )
      )
      .groupBy(transactions.categoryId);

    const prevSpendingMap = new Map(prevSpending.map((s) => [s.categoryId, Number(s.totalSpent) || 0]));

    // Build a map of category behaviors for carry-over logic
    const categoryBehaviorMap = new Map(
      budgetCategories.map(({ category }) => [category.id, category.behavior])
    );

    // Calculate carriedOver for each category (batched to avoid N+1)
    const carryOverUpdates: { id: string; carriedOver: number }[] = [];
    const carryOverInserts: { budgetId: string; categoryId: string; year: number; month: number; allocated: number; carriedOver: number }[] = [];

    for (const prevAlloc of prevMonthAllocationsList) {
      const prevSpent = prevSpendingMap.get(prevAlloc.categoryId) || 0;
      const prevAvailable = (prevAlloc.allocated || 0) + (prevAlloc.carriedOver || 0) - prevSpent;

      // Only carry over for "set_aside" categories (fix 2.6)
      // "refill_up" categories reset each month — no carry-over
      const behavior = categoryBehaviorMap.get(prevAlloc.categoryId) || "refill_up";
      const carryOver = behavior === "set_aside" ? Math.max(0, prevAvailable) : 0;

      // Find or create current month allocation
      const currentAlloc = allocationsMap.get(prevAlloc.categoryId);

      if (currentAlloc) {
        // Update if carriedOver is different
        if (currentAlloc.carriedOver !== carryOver) {
          carryOverUpdates.push({ id: currentAlloc.id, carriedOver: carryOver });
          // Update local map for this request
          currentAlloc.carriedOver = carryOver;
        }
      } else if (carryOver > 0) {
        // Queue new allocation with carriedOver (only if there's something to carry)
        carryOverInserts.push({
          budgetId,
          categoryId: prevAlloc.categoryId,
          year,
          month,
          allocated: 0,
          carriedOver: carryOver,
        });
      }
    }

    // Run carry-over updates and inserts atomically. Concurrent GETs could
    // otherwise violate unique_allocation when two requests insert the same
    // (budget, category, year, month) tuple simultaneously, so the insert
    // uses ON CONFLICT DO NOTHING and we re-read the row afterwards.
    if (carryOverUpdates.length > 0 || carryOverInserts.length > 0) {
      await db.transaction(async (tx) => {
        if (carryOverUpdates.length > 0) {
          await Promise.all(
            carryOverUpdates.map((u) =>
              tx
                .update(monthlyAllocations)
                .set({ carriedOver: u.carriedOver, updatedAt: new Date() })
                .where(eq(monthlyAllocations.id, u.id))
            )
          );
        }
        if (carryOverInserts.length > 0) {
          const inserted = await tx
            .insert(monthlyAllocations)
            .values(carryOverInserts)
            .onConflictDoNothing({
              target: [
                monthlyAllocations.budgetId,
                monthlyAllocations.categoryId,
                monthlyAllocations.year,
                monthlyAllocations.month,
              ],
            })
            .returning();
          for (const newAlloc of inserted) {
            allocationsMap.set(newAlloc.categoryId, newAlloc);
          }
        }
      });
    }
  }

  // Group allocation ceilings by groupId
  const groupAllocationsMap = new Map(
    groupAllocations.map((ga) => [ga.groupId, ga.allocated])
  );

  // Group bills by categoryId
  const billsMap = new Map<string, RecurringBillSummary[]>();

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
      startDate: bill.startDate,
      endDate: bill.endDate,
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
    startDate: Date | null;
    endDate: Date | null;
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
      pending: number;
      confirmed: number;
      saldo: number;
      available: number;
      isOtherMemberCategory: boolean; // True if category belongs to another member
      recurringBills: RecurringBillSummary[]; // Recurring bills for this category
    }>;
    totals: { allocated: number; spent: number; pending: number; confirmed: number; saldo: number; available: number };
    groupAllocated: number | null;
  }>();

  for (const { category, group } of budgetCategories) {
    if (!groupedData.has(group.id)) {
      const ceiling = groupAllocationsMap.get(group.id);
      groupedData.set(group.id, {
        group,
        categories: [],
        totals: { allocated: 0, spent: 0, pending: 0, confirmed: 0, saldo: 0, available: 0 },
        groupAllocated: ceiling != null ? ceiling : null,
      });
    }

    const allocation = allocationsMap.get(category.id);
    const categoryBills = billsMap.get(category.id) || [];

    const billsTotal = categoryBills.reduce((sum, bill) => sum + bill.amount, 0);
    // An existing allocation row means the user has explicitly set a value
    // (including 0). Falling back to billsTotal only when no row exists keeps
    // the "I intentionally zeroed this category" intent.
    const allocated = allocation ? allocation.allocated : billsTotal;
    const carriedOver = allocation?.carriedOver || 0;
    const spendSplit = spendingMap.get(category.id) ?? { pending: 0, confirmed: 0 };
    const pending = spendSplit.pending;
    const confirmed = spendSplit.confirmed;
    const spent = pending + confirmed;
    const saldo = allocated + carriedOver - pending - confirmed;
    const available = saldo;

    // Check if this category belongs to another member (not the current user)
    const isOtherMemberCategory = category.memberId !== null && category.memberId !== userMemberId;

    // Server-side privacy enforcement
    if (privacyMode === "private" && isOtherMemberCategory) {
      continue;
    }

    const groupData = groupedData.get(group.id)!;

    groupData.categories.push({
      category,
      allocated,
      carriedOver,
      spent,
      pending,
      confirmed,
      saldo,
      available,
      isOtherMemberCategory,
      recurringBills: categoryBills,
    });
    groupData.totals.allocated += allocated + carriedOver;
    groupData.totals.spent += spent;
    groupData.totals.pending += pending;
    groupData.totals.confirmed += confirmed;
    groupData.totals.saldo += saldo;
    groupData.totals.available += saldo;
  }

  // Calculate overall totals
  const overallTotals = {
    allocated: 0,
    spent: 0,
    pending: 0,
    confirmed: 0,
    saldo: 0,
    available: 0,
  };

  const groupedResult = Array.from(groupedData.values())
    .sort((a, b) => a.group.displayOrder - b.group.displayOrder)
    .map((g) => {
      if (g.groupAllocated != null && g.groupAllocated > 0) {
        // The ceiling caps allocated for the group, but carry-over from
        // previous months is additive and must not be discarded.
        const groupCarriedOver = g.categories.reduce((sum, c) => sum + c.carriedOver, 0);
        g.totals.allocated = g.groupAllocated + groupCarriedOver;
        g.totals.saldo = g.totals.allocated - g.totals.pending - g.totals.confirmed;
        g.totals.available = g.totals.saldo;
      }
      overallTotals.allocated += g.totals.allocated;
      overallTotals.spent += g.totals.spent;
      overallTotals.pending += g.totals.pending;
      overallTotals.confirmed += g.totals.confirmed;
      overallTotals.saldo += g.totals.saldo;
      overallTotals.available += g.totals.saldo;
      return g;
    });

  // PERFORMANCE: Run income-related queries in parallel
  const [budgetIncomeSources, incomeAllocations, incomeReceived] = await Promise.all([
    // Get income sources with member data (filtered by viewMode)
    (() => {
      const incomeViewCondition = userMemberId
        ? getViewModeCondition({
            viewMode,
            userMemberId,
            ownerField: incomeSources.memberId,
            partnerPrivacy,
          })
        : undefined;
      return db
        .select({
          incomeSource: incomeSources,
          member: budgetMembers,
        })
        .from(incomeSources)
        .leftJoin(budgetMembers, eq(incomeSources.memberId, budgetMembers.id))
        .where(
          and(
            eq(incomeSources.budgetId, budgetId),
            eq(incomeSources.isActive, true),
            ...(incomeViewCondition ? [incomeViewCondition] : [])
          )
        )
        .orderBy(incomeSources.displayOrder);
    })(),

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

    // Get income received per income source for this month (split pending vs confirmed)
    db
      .select({
        incomeSourceId: transactions.incomeSourceId,
        pendingReceived: sql<number>`SUM(CASE WHEN ${transactions.status} = 'pending' THEN ${transactions.amount} ELSE 0 END)`,
        confirmedReceived: sql<number>`SUM(CASE WHEN ${transactions.status} IN ('cleared', 'reconciled') THEN ${transactions.amount} ELSE 0 END)`,
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
    incomeAllocations.map((a) => [a.incomeSourceId, a])
  );

  const incomeReceivedMap = new Map(
    incomeReceived.map((i) => [
      i.incomeSourceId,
      {
        pending: Number(i.pendingReceived) || 0,
        confirmed: Number(i.confirmedReceived) || 0,
      },
    ])
  );

  // Group income sources by member
  const incomeByMember = new Map<string | null, {
    member: typeof budgetMembers.$inferSelect | null;
    sources: Array<{
      incomeSource: typeof incomeSources.$inferSelect;
      planned: number;
      contributionPlanned: number;
      defaultAmount: number;
      defaultContribution: number;
      pending: number;
      received: number;
      saldo: number;
    }>;
    totals: { planned: number; contributionPlanned: number; pending: number; received: number; saldo: number };
  }>();

  for (const { incomeSource, member } of budgetIncomeSources) {
    const memberId = incomeSource.memberId;

    if (!incomeByMember.has(memberId)) {
      incomeByMember.set(memberId, {
        member,
        sources: [],
        totals: { planned: 0, contributionPlanned: 0, pending: 0, received: 0, saldo: 0 },
      });
    }

    // Annual sources only appear in their target month
    if (incomeSource.frequency === "annual" && incomeSource.monthOfYear !== month) {
      continue;
    }
    // Once (pontual) sources only appear in their specific month+year
    if (incomeSource.frequency === "once" && (incomeSource.monthOfYear !== month || incomeSource.yearOfPayment !== year)) {
      continue;
    }
    // Skip if before start date (inclusive)
    if (incomeSource.startYear && incomeSource.startMonth) {
      if (year < incomeSource.startYear || (year === incomeSource.startYear && month < incomeSource.startMonth)) {
        continue;
      }
    }
    // Skip strictly AFTER the end date — the end month itself is included,
    // matching how users typically read "ends in June" (June is the last paid month).
    if (incomeSource.endYear && incomeSource.endMonth) {
      if (year > incomeSource.endYear || (year === incomeSource.endYear && month > incomeSource.endMonth)) {
        continue;
      }
    }

    // Calculate monthly amount based on frequency.
    // Weekly: count actual occurrences of dayOfWeek in the month (4 or 5).
    // Biweekly: 2 per month is a reasonable approximation; months with a 3rd
    // payday are rare and would require explicit override via monthly allocation.
    const frequencyMultiplier =
      incomeSource.frequency === "weekly"
        ? countWeekdayOccurrences(year, month, incomeSource.dayOfMonth ?? 5)
        : incomeSource.frequency === "biweekly"
          ? 2
          : 1;
    const defaultMonthlyAmount = (incomeSource.amount || 0) * frequencyMultiplier;
    const defaultMonthlyContribution = incomeSource.contributionAmount != null
      ? incomeSource.contributionAmount * frequencyMultiplier
      : defaultMonthlyAmount;

    const monthlyAlloc = incomeAllocationsMap.get(incomeSource.id);

    // Use monthly allocation if it exists, otherwise use calculated monthly amount
    const planned = monthlyAlloc?.planned ?? defaultMonthlyAmount;

    // Contribution: monthly override > income source default > full amount (100%)
    const contributionPlanned = monthlyAlloc?.contributionPlanned
      ?? (incomeSource.contributionAmount != null ? defaultMonthlyContribution : planned);

    const receivedSplit = incomeReceivedMap.get(incomeSource.id) ?? { pending: 0, confirmed: 0 };
    const pending = receivedSplit.pending;
    const received = receivedSplit.confirmed;
    const saldo = Math.max(0, planned - received - pending);

    const memberData = incomeByMember.get(memberId)!;
    memberData.sources.push({
      incomeSource,
      planned,
      contributionPlanned,
      defaultAmount: defaultMonthlyAmount,
      defaultContribution: defaultMonthlyContribution,
      pending,
      received,
      saldo,
    });
    memberData.totals.planned += planned;
    memberData.totals.contributionPlanned += contributionPlanned;
    memberData.totals.pending += pending;
    memberData.totals.received += received;
    memberData.totals.saldo += saldo;
  }

  // Calculate total income from income sources
  const incomeTotals = {
    planned: 0,
    contributionPlanned: 0,
    pending: 0,
    received: 0,
    saldo: 0,
  };

  const incomeGroups = Array.from(incomeByMember.values()).map((g) => {
    incomeTotals.planned += g.totals.planned;
    incomeTotals.contributionPlanned += g.totals.contributionPlanned;
    incomeTotals.pending += g.totals.pending;
    incomeTotals.received += g.totals.received;
    incomeTotals.saldo += g.totals.saldo;
    return g;
  });

  // Get total income/expense from transactions (filtered by viewMode)
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
        inArray(transactions.status, ["pending", "cleared", "reconciled"]),
        ...(txViewCondition ? [txViewCondition] : [])
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
    // Whether any income source has a contribution different from total amount
    hasContributionModel: incomeTotals.contributionPlanned !== incomeTotals.planned,
  });
});

// POST - Upsert an allocation
export const POST = withAuthRequired(async (req, context) => {
  const { session } = context;

  // Require active subscription for modifying allocations
  const subscriptionError = await requireActiveSubscription(session.user.id);
  if (subscriptionError) return subscriptionError;

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

  // Verify category belongs to budget AND that the current user is allowed
  // to allocate against it (categories of other members are off-limits).
  const userMemberId = await getUserMemberIdInBudget(session.user.id, budgetId);
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

  if (category.memberId !== null && category.memberId !== userMemberId) {
    return forbiddenError("Category belongs to another member");
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

// PUT - Upsert a group allocation (ceiling)
export const PUT = withAuthRequired(async (req, context) => {
  const { session } = context;

  const subscriptionError = await requireActiveSubscription(session.user.id);
  if (subscriptionError) return subscriptionError;

  const body = await req.json();
  const validation = upsertGroupAllocationSchema.safeParse(body);
  if (!validation.success) {
    return validationError(validation.error);
  }

  const { budgetId, groupId, year, month, allocated } = validation.data;

  const budgetIds = await getUserBudgetIds(session.user.id);
  if (!budgetIds.includes(budgetId)) {
    return forbiddenError("Budget not found or access denied");
  }

  // Verify the group belongs to this budget. Global groups (budgetId=null)
  // are shared across budgets and cannot have a budget-specific ceiling here,
  // unless they are explicitly associated with the budget.
  const [groupRow] = await db
    .select({ id: groups.id, budgetId: groups.budgetId })
    .from(groups)
    .where(eq(groups.id, groupId));
  if (!groupRow) {
    return errorResponse("Group not found", 404);
  }
  if (groupRow.budgetId !== null && groupRow.budgetId !== budgetId) {
    return forbiddenError("Group belongs to another budget");
  }

  // Upsert group allocation
  const [existing] = await db
    .select()
    .from(monthlyGroupAllocations)
    .where(
      and(
        eq(monthlyGroupAllocations.budgetId, budgetId),
        eq(monthlyGroupAllocations.groupId, groupId),
        eq(monthlyGroupAllocations.year, year),
        eq(monthlyGroupAllocations.month, month)
      )
    );

  let result;
  if (existing) {
    [result] = await db
      .update(monthlyGroupAllocations)
      .set({ allocated, updatedAt: new Date() })
      .where(eq(monthlyGroupAllocations.id, existing.id))
      .returning();
  } else {
    [result] = await db
      .insert(monthlyGroupAllocations)
      .values({ budgetId, groupId, year, month, allocated })
      .returning();
  }

  return successResponse({ groupAllocation: result }, existing ? 200 : 201);
});
