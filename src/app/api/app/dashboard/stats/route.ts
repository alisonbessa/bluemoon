import withAuthRequired from "@/shared/lib/auth/withAuthRequired";
import { db } from "@/db";
import { transactions, financialAccounts } from "@/db/schema";
import { eq, and, inArray, gte, lte, sql } from "drizzle-orm";
import { getUserBudgetIds } from "@/shared/lib/api/permissions";
import {
  forbiddenError,
  cachedResponse,
  errorResponse,
} from "@/shared/lib/api/responses";
import { getBillingCycleDates } from "@/shared/lib/billing-cycle";

// GET - Get dashboard statistics including daily data for charts
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

  // Calculate date ranges
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59);
  const daysInMonth = endDate.getDate();
  const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  const rangeStartDate = new Date(year, month - 1 - 11, 1); // 12 months back

  // PERFORMANCE: Run all three independent query blocks in parallel
  const [dailyData, monthlyAggregated, creditCardAccounts] = await Promise.all([
    // 1. Daily aggregated data for current month chart
    db
      .select({
        day: sql<number>`EXTRACT(DAY FROM ${transactions.date})::integer`,
        income: sql<number>`COALESCE(SUM(CASE WHEN ${transactions.type} = 'income' AND ${transactions.status} IN ('cleared', 'reconciled') THEN ${transactions.amount} ELSE 0 END), 0)`,
        expense: sql<number>`COALESCE(ABS(SUM(CASE WHEN ${transactions.type} = 'expense' AND ${transactions.status} IN ('cleared', 'reconciled') THEN ${transactions.amount} ELSE 0 END)), 0)`,
        pendingIncome: sql<number>`COALESCE(SUM(CASE WHEN ${transactions.type} = 'income' AND ${transactions.status} = 'pending' THEN ${transactions.amount} ELSE 0 END), 0)`,
        pendingExpense: sql<number>`COALESCE(ABS(SUM(CASE WHEN ${transactions.type} = 'expense' AND ${transactions.status} = 'pending' THEN ${transactions.amount} ELSE 0 END)), 0)`,
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
      .orderBy(sql`EXTRACT(DAY FROM ${transactions.date})`),

    // 2. Monthly comparison - single aggregated query instead of 12 sequential queries
    db
      .select({
        txYear: sql<number>`EXTRACT(YEAR FROM ${transactions.date})::integer`,
        txMonth: sql<number>`EXTRACT(MONTH FROM ${transactions.date})::integer`,
        income: sql<number>`COALESCE(SUM(CASE WHEN ${transactions.type} = 'income' THEN ${transactions.amount} ELSE 0 END), 0)`,
        expense: sql<number>`COALESCE(SUM(CASE WHEN ${transactions.type} = 'expense' THEN ${transactions.amount} ELSE 0 END), 0)`,
      })
      .from(transactions)
      .where(
        and(
          eq(transactions.budgetId, budgetId),
          gte(transactions.date, rangeStartDate),
          lte(transactions.date, endDate),
          inArray(transactions.status, ["pending", "cleared", "reconciled"])
        )
      )
      .groupBy(
        sql`EXTRACT(YEAR FROM ${transactions.date})`,
        sql`EXTRACT(MONTH FROM ${transactions.date})`
      ),

    // 3. Credit card accounts
    db
      .select({
        id: financialAccounts.id,
        name: financialAccounts.name,
        icon: financialAccounts.icon,
        creditLimit: financialAccounts.creditLimit,
        closingDay: financialAccounts.closingDay,
      })
      .from(financialAccounts)
      .where(
        and(
          eq(financialAccounts.budgetId, budgetId),
          eq(financialAccounts.type, "credit_card"),
          eq(financialAccounts.isArchived, false)
        )
      ),
  ]);

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
      pendingIncome,
      pendingExpense,
      pendingBalance: cumulativePendingBalance,
    });
  }

  // Build monthly comparison from aggregated data
  const monthlyMap = new Map(
    monthlyAggregated.map((m) => [`${m.txYear}-${m.txMonth}`, m])
  );

  const monthlyData = [];
  for (let i = 11; i >= 0; i--) {
    const targetDate = new Date(year, month - 1 - i, 1);
    const targetYear = targetDate.getFullYear();
    const targetMonth = targetDate.getMonth() + 1;
    const data = monthlyMap.get(`${targetYear}-${targetMonth}`);

    monthlyData.push({
      month: monthNames[targetMonth - 1],
      year: targetYear,
      label: `${monthNames[targetMonth - 1]}/${targetYear.toString().slice(-2)}`,
      income: Number(data?.income) || 0,
      expense: Number(data?.expense) || 0,
    });
  }

  // Calculate spending per credit card using billing cycle dates
  // Optimized: single query with widest date range + client-side filtering per billing cycle
  let creditCards: { id: string; name: string; icon: string | null; creditLimit: number; spent: number; available: number }[] = [];

  if (creditCardAccounts.length > 0) {
    // Compute billing cycle ranges per card and find widest range for single query
    let globalStart = startDate;
    let globalEnd = endDate;
    const billingRanges = new Map<string, { start: Date; end: Date }>();

    for (const cc of creditCardAccounts) {
      if (cc.closingDay) {
        const cycle = getBillingCycleDates(cc.closingDay, year, month);
        billingRanges.set(cc.id, cycle);
        if (cycle.start < globalStart) globalStart = cycle.start;
        if (cycle.end > globalEnd) globalEnd = cycle.end;
      } else {
        billingRanges.set(cc.id, { start: startDate, end: endDate });
      }
    }

    // Single query fetching all CC expense transactions in the widest range
    const ccIds = creditCardAccounts.map((cc) => cc.id);
    const ccTransactions = await db
      .select({
        accountId: transactions.accountId,
        amount: transactions.amount,
        date: transactions.date,
      })
      .from(transactions)
      .where(
        and(
          inArray(transactions.accountId, ccIds),
          eq(transactions.type, "expense"),
          gte(transactions.date, globalStart),
          lte(transactions.date, globalEnd),
          inArray(transactions.status, ["pending", "cleared", "reconciled"])
        )
      );

    // Aggregate per card filtered by its specific billing cycle
    creditCards = creditCardAccounts.map((cc) => {
      const range = billingRanges.get(cc.id)!;
      const startTime = range.start.getTime();
      const endTime = range.end.getTime();

      let spent = 0;
      for (const tx of ccTransactions) {
        if (tx.accountId === cc.id) {
          const txTime = new Date(tx.date).getTime();
          if (txTime >= startTime && txTime <= endTime) {
            spent += Math.abs(Number(tx.amount) || 0);
          }
        }
      }

      return {
        id: cc.id,
        name: cc.name,
        icon: cc.icon,
        creditLimit: cc.creditLimit || 0,
        spent,
        available: (cc.creditLimit || 0) - spent,
      };
    });
  }

  return cachedResponse(
    { dailyChartData, monthlyComparison: monthlyData, creditCards },
    { maxAge: 30, staleWhileRevalidate: 120 }
  );
});
