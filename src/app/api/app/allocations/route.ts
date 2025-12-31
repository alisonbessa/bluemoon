import withAuthRequired from "@/lib/auth/withAuthRequired";
import { db } from "@/db";
import { monthlyAllocations, budgetMembers, categories, groups, transactions, incomeSources, monthlyIncomeAllocations, monthlyBudgetStatus } from "@/db/schema";
import { eq, and, inArray, sql, gte, lte } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

const upsertAllocationSchema = z.object({
  budgetId: z.string().uuid(),
  categoryId: z.string().uuid(),
  year: z.number().int().min(2020).max(2100),
  month: z.number().int().min(1).max(12),
  allocated: z.number().int().min(0),
});

// Helper to get user's budget IDs
async function getUserBudgetIds(userId: string) {
  const memberships = await db
    .select({ budgetId: budgetMembers.budgetId })
    .from(budgetMembers)
    .where(eq(budgetMembers.userId, userId));
  return memberships.map((m) => m.budgetId);
}

// GET - Get allocations for a specific month with spending data
export const GET = withAuthRequired(async (req, context) => {
  const { session } = context;
  const { searchParams } = new URL(req.url);
  const budgetId = searchParams.get("budgetId");
  const year = parseInt(searchParams.get("year") || new Date().getFullYear().toString());
  const month = parseInt(searchParams.get("month") || (new Date().getMonth() + 1).toString());

  if (!budgetId) {
    return NextResponse.json({ error: "budgetId is required" }, { status: 400 });
  }

  const budgetIds = await getUserBudgetIds(session.user.id);
  if (!budgetIds.includes(budgetId)) {
    return NextResponse.json({ error: "Budget not found or access denied" }, { status: 404 });
  }

  // Calculate date range for this month
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59);

  // PERFORMANCE: Run independent queries in parallel
  const [budgetCategories, allocations, spending] = await Promise.all([
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
  ]);

  const spendingMap = new Map(spending.map((s) => [s.categoryId, Number(s.totalSpent) || 0]));
  const allocationsMap = new Map(allocations.map((a) => [a.categoryId, a]));

  // Group categories by group
  const groupedData = new Map<string, {
    group: typeof groups.$inferSelect;
    categories: Array<{
      category: typeof categories.$inferSelect;
      allocated: number;
      carriedOver: number;
      spent: number;
      available: number;
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
    const allocated = allocation?.allocated || category.plannedAmount || 0;
    const carriedOver = allocation?.carriedOver || 0;
    const spent = spendingMap.get(category.id) || 0;
    const available = allocated + carriedOver - spent;

    const groupData = groupedData.get(group.id)!;
    groupData.categories.push({
      category,
      allocated,
      carriedOver,
      spent,
      available,
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

    // Use monthly allocation if it exists, otherwise use default amount
    const defaultAmount = incomeSource.amount || 0;
    const planned = incomeAllocationsMap.has(incomeSource.id)
      ? incomeAllocationsMap.get(incomeSource.id)!
      : defaultAmount;
    const received = incomeReceivedMap.get(incomeSource.id) || 0;

    const memberData = incomeByMember.get(memberId)!;
    memberData.sources.push({
      incomeSource,
      planned,
      defaultAmount,
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

  // Also get total income/expense from ALL transactions (even without incomeSourceId or categoryId)
  const [transactionTotals] = await db
    .select({
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

  // Use the actual transaction totals for received/spent
  // But keep planned from income sources
  const actualIncome = Number(transactionTotals?.totalIncome) || 0;
  const actualExpense = Number(transactionTotals?.totalExpense) || 0;

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

  // Check if previous month has any allocations
  const prevMonth = month === 1 ? 12 : month - 1;
  const prevYear = month === 1 ? year - 1 : year;

  const [prevMonthAllocations] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(monthlyAllocations)
    .where(
      and(
        eq(monthlyAllocations.budgetId, budgetId),
        eq(monthlyAllocations.year, prevYear),
        eq(monthlyAllocations.month, prevMonth)
      )
    );

  const hasPreviousMonthData = (prevMonthAllocations?.count || 0) > 0;

  return NextResponse.json({
    year,
    month,
    monthStatus: monthStatus?.status || "planning",
    monthStartedAt: monthStatus?.startedAt || null,
    hasPreviousMonthData,
    groups: groupedResult,
    totals: {
      ...overallTotals,
      // Use actual expense total from all transactions (more accurate)
      spent: actualExpense,
    },
    income: {
      byMember: incomeGroups,
      totals: {
        ...incomeTotals,
        // Use actual income total from all transactions (more accurate)
        received: actualIncome,
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
    return NextResponse.json(
      { error: "Validation failed", details: validation.error.errors },
      { status: 400 }
    );
  }

  const { budgetId, categoryId, year, month, allocated } = validation.data;

  // Check user has access to budget
  const budgetIds = await getUserBudgetIds(session.user.id);
  if (!budgetIds.includes(budgetId)) {
    return NextResponse.json(
      { error: "Budget not found or access denied" },
      { status: 404 }
    );
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
    return NextResponse.json({ error: "Category not found" }, { status: 404 });
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

  return NextResponse.json({ allocation: result }, { status: existingAllocation ? 200 : 201 });
});
