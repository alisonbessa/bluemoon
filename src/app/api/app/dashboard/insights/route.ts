import withAuthRequired from "@/shared/lib/auth/withAuthRequired";
import { db } from "@/db";
import {
  transactions,
  categories,
  groups,
  monthlyAllocations,
} from "@/db/schema";
import { eq, and, inArray, gte, lte, sql, desc } from "drizzle-orm";
import { getUserBudgetIds } from "@/shared/lib/api/permissions";
import {
  forbiddenError,
  cachedResponse,
  errorResponse,
} from "@/shared/lib/api/responses";

// GET - Get monthly insights data
export const GET = withAuthRequired(async (req, context) => {
  const { session } = context;
  const { searchParams } = new URL(req.url);

  const budgetId = searchParams.get("budgetId");
  const year = parseInt(
    searchParams.get("year") || new Date().getFullYear().toString()
  );
  const month = parseInt(
    searchParams.get("month") || (new Date().getMonth() + 1).toString()
  );

  if (!budgetId) {
    return errorResponse("budgetId is required", 400);
  }

  const budgetIds = await getUserBudgetIds(session.user.id);
  if (!budgetIds.includes(budgetId)) {
    return forbiddenError("Budget not found or access denied");
  }

  // Date ranges
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59);
  const daysInMonth = endDate.getDate();

  // Previous month
  const prevMonth = month === 1 ? 12 : month - 1;
  const prevYear = month === 1 ? year - 1 : year;
  const prevStartDate = new Date(prevYear, prevMonth - 1, 1);
  const prevEndDate = new Date(prevYear, prevMonth, 0, 23, 59, 59);

  // Current progress through the month
  const today = new Date();
  const isCurrentMonth =
    year === today.getFullYear() && month === today.getMonth() + 1;
  const dayOfMonth = isCurrentMonth ? today.getDate() : daysInMonth;
  const monthProgress = (dayOfMonth / daysInMonth) * 100;

  const [
    currentMonthTotals,
    prevMonthTotals,
    topCategories,
    prevTopCategories,
    currentAllocations,
    categorySpending,
  ] = await Promise.all([
    // 1. Current month totals
    db
      .select({
        totalIncome: sql<number>`COALESCE(SUM(CASE WHEN ${transactions.type} = 'income' THEN ${transactions.amount} ELSE 0 END), 0)`,
        totalExpense: sql<number>`COALESCE(SUM(CASE WHEN ${transactions.type} = 'expense' THEN ${transactions.amount} ELSE 0 END), 0)`,
        confirmedIncome: sql<number>`COALESCE(SUM(CASE WHEN ${transactions.type} = 'income' AND ${transactions.status} IN ('cleared', 'reconciled') THEN ${transactions.amount} ELSE 0 END), 0)`,
        confirmedExpense: sql<number>`COALESCE(SUM(CASE WHEN ${transactions.type} = 'expense' AND ${transactions.status} IN ('cleared', 'reconciled') THEN ${transactions.amount} ELSE 0 END), 0)`,
        transactionCount: sql<number>`COUNT(*)::integer`,
      })
      .from(transactions)
      .where(
        and(
          eq(transactions.budgetId, budgetId),
          gte(transactions.date, startDate),
          lte(transactions.date, endDate),
          inArray(transactions.status, ["pending", "cleared", "reconciled"])
        )
      ),

    // 2. Previous month totals
    db
      .select({
        totalIncome: sql<number>`COALESCE(SUM(CASE WHEN ${transactions.type} = 'income' THEN ${transactions.amount} ELSE 0 END), 0)`,
        totalExpense: sql<number>`COALESCE(SUM(CASE WHEN ${transactions.type} = 'expense' THEN ${transactions.amount} ELSE 0 END), 0)`,
        confirmedIncome: sql<number>`COALESCE(SUM(CASE WHEN ${transactions.type} = 'income' AND ${transactions.status} IN ('cleared', 'reconciled') THEN ${transactions.amount} ELSE 0 END), 0)`,
        confirmedExpense: sql<number>`COALESCE(SUM(CASE WHEN ${transactions.type} = 'expense' AND ${transactions.status} IN ('cleared', 'reconciled') THEN ${transactions.amount} ELSE 0 END), 0)`,
      })
      .from(transactions)
      .where(
        and(
          eq(transactions.budgetId, budgetId),
          gte(transactions.date, prevStartDate),
          lte(transactions.date, prevEndDate),
          inArray(transactions.status, ["pending", "cleared", "reconciled"])
        )
      ),

    // 3. Top categories by spending (current month)
    db
      .select({
        categoryId: transactions.categoryId,
        categoryName: categories.name,
        categoryIcon: categories.icon,
        categoryColor: categories.color,
        groupName: groups.name,
        groupCode: groups.code,
        totalSpent: sql<number>`ABS(SUM(${transactions.amount}))`,
      })
      .from(transactions)
      .innerJoin(categories, eq(transactions.categoryId, categories.id))
      .innerJoin(groups, eq(categories.groupId, groups.id))
      .where(
        and(
          eq(transactions.budgetId, budgetId),
          eq(transactions.type, "expense"),
          gte(transactions.date, startDate),
          lte(transactions.date, endDate),
          inArray(transactions.status, ["pending", "cleared", "reconciled"])
        )
      )
      .groupBy(
        transactions.categoryId,
        categories.name,
        categories.icon,
        categories.color,
        groups.name,
        groups.code
      )
      .orderBy(desc(sql`ABS(SUM(${transactions.amount}))`))
      .limit(5),

    // 4. Top categories by spending (previous month, for comparison)
    db
      .select({
        categoryId: transactions.categoryId,
        totalSpent: sql<number>`ABS(SUM(${transactions.amount}))`,
      })
      .from(transactions)
      .where(
        and(
          eq(transactions.budgetId, budgetId),
          eq(transactions.type, "expense"),
          gte(transactions.date, prevStartDate),
          lte(transactions.date, prevEndDate),
          inArray(transactions.status, ["pending", "cleared", "reconciled"])
        )
      )
      .groupBy(transactions.categoryId),

    // 5. Current month allocations
    db
      .select({
        categoryId: monthlyAllocations.categoryId,
        allocated: monthlyAllocations.allocated,
        carriedOver: monthlyAllocations.carriedOver,
      })
      .from(monthlyAllocations)
      .where(
        and(
          eq(monthlyAllocations.budgetId, budgetId),
          eq(monthlyAllocations.year, year),
          eq(monthlyAllocations.month, month)
        )
      ),

    // 6. All category spending for over-budget detection
    db
      .select({
        categoryId: transactions.categoryId,
        categoryName: categories.name,
        categoryIcon: categories.icon,
        categoryColor: categories.color,
        totalSpent: sql<number>`ABS(SUM(${transactions.amount}))`,
      })
      .from(transactions)
      .innerJoin(categories, eq(transactions.categoryId, categories.id))
      .where(
        and(
          eq(transactions.budgetId, budgetId),
          eq(transactions.type, "expense"),
          gte(transactions.date, startDate),
          lte(transactions.date, endDate),
          inArray(transactions.status, ["pending", "cleared", "reconciled"])
        )
      )
      .groupBy(
        transactions.categoryId,
        categories.name,
        categories.icon,
        categories.color
      ),
  ]);

  // Process current month totals
  const income = Number(currentMonthTotals[0]?.totalIncome) || 0;
  const expense = Number(currentMonthTotals[0]?.totalExpense) || 0;
  const confirmedExpense =
    Number(currentMonthTotals[0]?.confirmedExpense) || 0;
  const transactionCount =
    Number(currentMonthTotals[0]?.transactionCount) || 0;
  const savings = income - expense;

  // Previous month
  const prevIncome = Number(prevMonthTotals[0]?.totalIncome) || 0;
  const prevExpense = Number(prevMonthTotals[0]?.totalExpense) || 0;
  const prevSavings = prevIncome - prevExpense;

  // Total allocated budget
  const totalAllocated = currentAllocations.reduce(
    (sum: number, a) => sum + (a.allocated || 0) + (a.carriedOver || 0),
    0
  );

  // Budget health: % spent vs % of month elapsed
  const budgetSpentPercent =
    totalAllocated > 0 ? (expense / totalAllocated) * 100 : 0;
  const budgetHealth =
    totalAllocated > 0
      ? monthProgress > 0
        ? monthProgress / budgetSpentPercent
        : 1
      : 1;
  // > 1 means spending slower than time (good), < 1 means overspending

  // Daily average spending and projection
  const dailyAvgExpense = dayOfMonth > 0 ? expense / dayOfMonth : 0;
  const projectedExpense = isCurrentMonth
    ? dailyAvgExpense * daysInMonth
    : expense;

  // Build allocations map for over-budget detection
  const allocationsMap = new Map(
    currentAllocations.map((a) => [
      a.categoryId,
      (a.allocated || 0) + (a.carriedOver || 0),
    ])
  );

  // Build prev month spending map
  const prevSpendingMap = new Map(
    prevTopCategories.map((c) => [c.categoryId, Number(c.totalSpent) || 0])
  );

  // Categories over budget
  const overBudgetCategories = categorySpending
    .map((c) => {
      const allocated = allocationsMap.get(c.categoryId) || 0;
      const spent = Number(c.totalSpent) || 0;
      if (allocated > 0 && spent > allocated) {
        return {
          id: c.categoryId,
          name: c.categoryName,
          icon: c.categoryIcon,
          color: c.categoryColor,
          allocated,
          spent,
          overAmount: spent - allocated,
          overPercent: Math.round(((spent - allocated) / allocated) * 100),
        };
      }
      return null;
    })
    .filter((item): item is NonNullable<typeof item> => item !== null)
    .sort((a, b) => b.overAmount - a.overAmount);

  // Top categories with comparison
  const topCategoriesWithComparison = topCategories.map((c) => {
    const spent = Number(c.totalSpent) || 0;
    const prevSpent = prevSpendingMap.get(c.categoryId) || 0;
    const allocated = allocationsMap.get(c.categoryId) || 0;
    const variation =
      prevSpent > 0 ? Math.round(((spent - prevSpent) / prevSpent) * 100) : null;

    return {
      id: c.categoryId,
      name: c.categoryName,
      icon: c.categoryIcon,
      color: c.categoryColor,
      groupName: c.groupName,
      groupCode: c.groupCode,
      spent,
      allocated,
      percentOfTotal: expense > 0 ? Math.round((spent / expense) * 100) : 0,
      variation,
    };
  });

  // Month comparison
  const incomeVariation =
    prevIncome > 0
      ? Math.round(((income - prevIncome) / prevIncome) * 100)
      : null;
  const expenseVariation =
    prevExpense > 0
      ? Math.round(((expense - prevExpense) / prevExpense) * 100)
      : null;
  const savingsVariation =
    prevSavings !== 0
      ? Math.round(((savings - prevSavings) / Math.abs(prevSavings)) * 100)
      : null;

  return cachedResponse(
    {
      month: { year, month, daysInMonth, dayOfMonth, isCurrentMonth },
      summary: {
        income,
        expense,
        savings,
        transactionCount,
        totalAllocated,
      },
      budgetHealth: {
        spentPercent: Math.round(budgetSpentPercent),
        monthProgress: Math.round(monthProgress),
        healthRatio: Math.round(budgetHealth * 100) / 100,
        status:
          budgetHealth >= 1.2
            ? "excellent"
            : budgetHealth >= 0.9
              ? "good"
              : budgetHealth >= 0.7
                ? "warning"
                : "critical",
      },
      projection: {
        dailyAvgExpense: Math.round(dailyAvgExpense),
        projectedExpense: Math.round(projectedExpense),
        projectedSavings: Math.round(income - projectedExpense),
        isOnTrack: projectedExpense <= totalAllocated,
      },
      topCategories: topCategoriesWithComparison,
      overBudgetCategories,
      comparison: {
        income: { current: income, previous: prevIncome, variation: incomeVariation },
        expense: { current: expense, previous: prevExpense, variation: expenseVariation },
        savings: { current: savings, previous: prevSavings, variation: savingsVariation },
      },
    },
    { maxAge: 30, staleWhileRevalidate: 120 }
  );
});
