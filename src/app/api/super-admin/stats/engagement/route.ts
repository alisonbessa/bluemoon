import { NextRequest, NextResponse } from "next/server";
import withSuperAdminAuthRequired from "@/shared/lib/auth/withSuperAdminAuthRequired";
import { db } from "@/db";
import { transactions } from "@/db/schema/transactions";
import { telegramAILogs } from "@/db/schema/telegram-ai-logs";
import { users } from "@/db/schema/user";
import { sql } from "drizzle-orm";
import { subDays, startOfDay, format } from "date-fns";

export const GET = withSuperAdminAuthRequired(async (req: NextRequest) => {
  const { searchParams } = new URL(req.url);
  const days = Math.min(Number(searchParams.get("days") || "30"), 365);

  const periodStart = startOfDay(subDays(new Date(), days));
  const periodStartISO = periodStart.toISOString();
  const previousPeriodStart = startOfDay(subDays(new Date(), days * 2));
  const previousPeriodStartISO = previousPeriodStart.toISOString();

  // Generate date array for the period
  const dates = Array.from({ length: days + 1 }, (_, i) => {
    return format(subDays(new Date(), days - i), "yyyy-MM-dd");
  });

  // Generate date array for previous period
  const prevDates = Array.from({ length: days + 1 }, (_, i) => {
    return format(subDays(new Date(), days * 2 - i), "yyyy-MM-dd");
  });

  const [
    dailyTransactionsResult,
    prevDailyTransactionsResult,
    transactionsBySourceResult,
    transactionsByTypeResult,
    telegramDailyResult,
    prevTelegramDailyResult,
    telegramResolutionResult,
    onboardingFunnelResult,
  ] = await Promise.all([
    // Daily transactions count - current period
    db
      .select({
        date: sql<string>`DATE(${transactions.createdAt})::text`,
        count: sql<number>`COUNT(*)`,
      })
      .from(transactions)
      .where(sql`${transactions.createdAt} >= ${periodStartISO}::timestamp`)
      .groupBy(sql`DATE(${transactions.createdAt})`)
      .orderBy(sql`DATE(${transactions.createdAt})`),

    // Daily transactions count - previous period
    db
      .select({
        date: sql<string>`DATE(${transactions.createdAt})::text`,
        count: sql<number>`COUNT(*)`,
      })
      .from(transactions)
      .where(sql`${transactions.createdAt} >= ${previousPeriodStartISO}::timestamp AND ${transactions.createdAt} < ${periodStartISO}::timestamp`)
      .groupBy(sql`DATE(${transactions.createdAt})`)
      .orderBy(sql`DATE(${transactions.createdAt})`),

    // Transactions by source (web vs telegram)
    db
      .select({
        source: transactions.source,
        count: sql<number>`COUNT(*)`,
      })
      .from(transactions)
      .where(sql`${transactions.createdAt} >= ${periodStartISO}::timestamp`)
      .groupBy(transactions.source),

    // Transactions by type (income, expense, transfer)
    db
      .select({
        type: transactions.type,
        count: sql<number>`COUNT(*)`,
      })
      .from(transactions)
      .where(sql`${transactions.createdAt} >= ${periodStartISO}::timestamp`)
      .groupBy(transactions.type),

    // Daily telegram messages - current period
    db
      .select({
        date: sql<string>`DATE(${telegramAILogs.createdAt})::text`,
        count: sql<number>`COUNT(*)`,
      })
      .from(telegramAILogs)
      .where(
        sql`${telegramAILogs.createdAt} >= ${periodStartISO}::timestamp`
      )
      .groupBy(sql`DATE(${telegramAILogs.createdAt})`)
      .orderBy(sql`DATE(${telegramAILogs.createdAt})`),

    // Daily telegram messages - previous period
    db
      .select({
        date: sql<string>`DATE(${telegramAILogs.createdAt})::text`,
        count: sql<number>`COUNT(*)`,
      })
      .from(telegramAILogs)
      .where(
        sql`${telegramAILogs.createdAt} >= ${previousPeriodStartISO}::timestamp AND ${telegramAILogs.createdAt} < ${periodStartISO}::timestamp`
      )
      .groupBy(sql`DATE(${telegramAILogs.createdAt})`)
      .orderBy(sql`DATE(${telegramAILogs.createdAt})`),

    // Telegram resolution breakdown
    db
      .select({
        resolution: telegramAILogs.resolution,
        count: sql<number>`COUNT(*)`,
      })
      .from(telegramAILogs)
      .where(
        sql`${telegramAILogs.createdAt} >= ${periodStartISO}::timestamp`
      )
      .groupBy(telegramAILogs.resolution),

    // Onboarding funnel
    db
      .select({
        totalSignups: sql<number>`COUNT(*)`,
        completedOnboarding: sql<number>`SUM(CASE WHEN ${users.onboardingCompletedAt} IS NOT NULL THEN 1 ELSE 0 END)`,
        withTransactions: sql<number>`(
          SELECT COUNT(DISTINCT bm.user_id)
          FROM budget_members bm
          JOIN transactions t ON t.budget_id = bm.budget_id
          WHERE bm.user_id IN (
            SELECT id FROM app_user
            WHERE "createdAt" >= ${periodStartISO}::timestamp
            AND deleted_at IS NULL
          )
        )`,
        withTelegram: sql<number>`(
          SELECT COUNT(DISTINCT user_id)
          FROM telegram_ai_logs
          WHERE user_id IN (
            SELECT id FROM app_user
            WHERE "createdAt" >= ${periodStartISO}::timestamp
            AND deleted_at IS NULL
          )
        )`,
      })
      .from(users)
      .where(
        sql`${users.createdAt} >= ${periodStartISO}::timestamp AND ${users.deletedAt} IS NULL`
      ),
  ]);

  // Build daily chart data - current period
  const transactionsByDate = new Map(
    dailyTransactionsResult.map((r) => [r.date, Number(r.count)])
  );
  const telegramByDate = new Map(
    telegramDailyResult.map((r) => [r.date, Number(r.count)])
  );

  const dailyChart = dates.map((date) => ({
    date,
    transactions: transactionsByDate.get(date) || 0,
    telegramMessages: telegramByDate.get(date) || 0,
  }));

  // Build daily chart data - previous period (indexed by day offset for overlay)
  const prevTransactionsByDate = new Map(
    prevDailyTransactionsResult.map((r) => [r.date, Number(r.count)])
  );
  const prevTelegramByDate = new Map(
    prevTelegramDailyResult.map((r) => [r.date, Number(r.count)])
  );

  const prevDailyChart = prevDates.map((date) => ({
    date,
    transactions: prevTransactionsByDate.get(date) || 0,
    telegramMessages: prevTelegramByDate.get(date) || 0,
  }));

  // Source breakdown
  const sourceMap: Record<string, number> = {};
  for (const r of transactionsBySourceResult) {
    sourceMap[r.source || "web"] = Number(r.count);
  }

  // Type breakdown
  const typeMap: Record<string, number> = {};
  for (const r of transactionsByTypeResult) {
    typeMap[r.type] = Number(r.count);
  }

  // Resolution breakdown
  const resolutionMap: Record<string, number> = {};
  for (const r of telegramResolutionResult) {
    resolutionMap[r.resolution] = Number(r.count);
  }

  const funnel = onboardingFunnelResult[0];

  return NextResponse.json({
    data: {
      dailyChart,
      prevDailyChart,
      transactionsBySource: sourceMap,
      transactionsByType: typeMap,
      telegramResolutions: resolutionMap,
      onboardingFunnel: {
        signups: Number(funnel?.totalSignups || 0),
        completedOnboarding: Number(funnel?.completedOnboarding || 0),
        createdTransactions: Number(funnel?.withTransactions || 0),
        usedTelegram: Number(funnel?.withTelegram || 0),
      },
    },
  });
});
