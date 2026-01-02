import withAuthRequired from "@/lib/auth/withAuthRequired";
import { db } from "@/db";
import { transactions, budgetMembers, financialAccounts } from "@/db/schema";
import { eq, and, inArray, gte, lte, sql } from "drizzle-orm";
import { NextResponse } from "next/server";

// Helper to get user's budget IDs
async function getUserBudgetIds(userId: string) {
  const memberships = await db
    .select({ budgetId: budgetMembers.budgetId })
    .from(budgetMembers)
    .where(eq(budgetMembers.userId, userId));
  return memberships.map((m) => m.budgetId);
}

// GET - Get dashboard statistics including daily data for charts
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

  // Calculate date range for current month
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59);
  const daysInMonth = endDate.getDate();

  // Get daily aggregated data - separating by status
  // "Realizado" = cleared or reconciled
  // "Pendente" = pending (scheduled but not yet paid)
  const dailyData = await db
    .select({
      day: sql<number>`EXTRACT(DAY FROM ${transactions.date})::integer`,
      // Realized income (cleared/reconciled)
      income: sql<number>`COALESCE(SUM(CASE WHEN ${transactions.type} = 'income' AND ${transactions.status} IN ('cleared', 'reconciled') THEN ${transactions.amount} ELSE 0 END), 0)`,
      // Realized expense (cleared/reconciled)
      expense: sql<number>`COALESCE(SUM(CASE WHEN ${transactions.type} = 'expense' AND ${transactions.status} IN ('cleared', 'reconciled') THEN ${transactions.amount} ELSE 0 END), 0)`,
      // Pending income
      pendingIncome: sql<number>`COALESCE(SUM(CASE WHEN ${transactions.type} = 'income' AND ${transactions.status} = 'pending' THEN ${transactions.amount} ELSE 0 END), 0)`,
      // Pending expense
      pendingExpense: sql<number>`COALESCE(SUM(CASE WHEN ${transactions.type} = 'expense' AND ${transactions.status} = 'pending' THEN ${transactions.amount} ELSE 0 END), 0)`,
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
    .groupBy(sql`EXTRACT(DAY FROM ${transactions.date})`)
    .orderBy(sql`EXTRACT(DAY FROM ${transactions.date})`);

  // Build daily chart data with cumulative balance
  const dailyChartData = [];
  let cumulativeBalance = 0;
  let cumulativePendingBalance = 0;

  for (let day = 1; day <= daysInMonth; day++) {
    const dayData = dailyData.find((d) => d.day === day);
    const income = Number(dayData?.income) || 0;
    const expense = Number(dayData?.expense) || 0;
    const pendingIncome = Number(dayData?.pendingIncome) || 0;
    const pendingExpense = Number(dayData?.pendingExpense) || 0;

    cumulativeBalance += income - expense;
    cumulativePendingBalance += (income + pendingIncome) - (expense + pendingExpense);

    dailyChartData.push({
      day,
      date: `${day}/${month}`,
      income,
      expense,
      balance: cumulativeBalance,
      // Pending transactions (planned but not yet realized)
      pendingIncome,
      pendingExpense,
      pendingBalance: cumulativePendingBalance,
    });
  }

  // Get monthly comparison data (last 12 months ending at the selected month)
  const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  const monthlyData = [];

  // Calculate 12 months back from the current selected month
  for (let i = 11; i >= 0; i--) {
    const targetDate = new Date(year, month - 1 - i, 1);
    const targetYear = targetDate.getFullYear();
    const targetMonth = targetDate.getMonth() + 1; // 1-indexed
    const compareStartDate = new Date(targetYear, targetMonth - 1, 1);
    const compareEndDate = new Date(targetYear, targetMonth, 0, 23, 59, 59);

    const [monthTotals] = await db
      .select({
        income: sql<number>`COALESCE(SUM(CASE WHEN ${transactions.type} = 'income' THEN ${transactions.amount} ELSE 0 END), 0)`,
        expense: sql<number>`COALESCE(SUM(CASE WHEN ${transactions.type} = 'expense' THEN ${transactions.amount} ELSE 0 END), 0)`,
      })
      .from(transactions)
      .where(
        and(
          eq(transactions.budgetId, budgetId),
          gte(transactions.date, compareStartDate),
          lte(transactions.date, compareEndDate),
          inArray(transactions.status, ["pending", "cleared", "reconciled"])
        )
      );

    monthlyData.push({
      month: monthNames[targetMonth - 1],
      year: targetYear,
      label: `${monthNames[targetMonth - 1]}/${targetYear.toString().slice(-2)}`,
      income: Number(monthTotals?.income) || 0,
      expense: Number(monthTotals?.expense) || 0,
    });
  }

  // Get credit card spending per card for current month
  const creditCardSpending = await db
    .select({
      accountId: financialAccounts.id,
      accountName: financialAccounts.name,
      accountIcon: financialAccounts.icon,
      creditLimit: financialAccounts.creditLimit,
      spent: sql<number>`COALESCE(SUM(${transactions.amount}), 0)`,
    })
    .from(financialAccounts)
    .leftJoin(
      transactions,
      and(
        eq(transactions.accountId, financialAccounts.id),
        eq(transactions.type, "expense"),
        gte(transactions.date, startDate),
        lte(transactions.date, endDate),
        inArray(transactions.status, ["pending", "cleared", "reconciled"])
      )
    )
    .where(
      and(
        eq(financialAccounts.budgetId, budgetId),
        eq(financialAccounts.type, "credit_card"),
        eq(financialAccounts.isArchived, false)
      )
    )
    .groupBy(financialAccounts.id, financialAccounts.name, financialAccounts.icon, financialAccounts.creditLimit);

  return NextResponse.json({
    dailyChartData,
    monthlyComparison: monthlyData,
    creditCards: creditCardSpending.map((cc) => ({
      id: cc.accountId,
      name: cc.accountName,
      icon: cc.accountIcon,
      creditLimit: cc.creditLimit || 0,
      spent: Number(cc.spent) || 0,
      available: (cc.creditLimit || 0) - (Number(cc.spent) || 0),
    })),
  });
});
