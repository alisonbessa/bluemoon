import { NextRequest, NextResponse } from "next/server";
import withSuperAdminAuthRequired from "@/shared/lib/auth/withSuperAdminAuthRequired";
import { db } from "@/db";
import { users } from "@/db/schema/user";
import { transactions } from "@/db/schema/transactions";
import { telegramAILogs } from "@/db/schema/telegram-ai-logs";
import { feedbacks } from "@/db/schema/feedback";
import { budgetMembers } from "@/db/schema/budget-members";
import { sql } from "drizzle-orm";
import { subDays, startOfDay } from "date-fns";

export const GET = withSuperAdminAuthRequired(async (req: NextRequest) => {
  const { searchParams } = new URL(req.url);
  const days = Math.min(Number(searchParams.get("days") || "30"), 365);

  const now = new Date();
  const periodStart = startOfDay(subDays(now, days));
  const previousPeriodStart = startOfDay(subDays(now, days * 2));

  const periodStartISO = periodStart.toISOString();
  const previousPeriodStartISO = previousPeriodStart.toISOString();

  // Run all queries in parallel
  const [
    totalUsersResult,
    newUsersCurrentResult,
    newUsersPreviousResult,
    activeUsersCurrentResult,
    activeUsersPreviousResult,
    transactionsCurrentResult,
    transactionsPreviousResult,
    telegramUsersCurrentResult,
    telegramUsersPreviousResult,
    onboardingCompletedResult,
    onboardingCompletedPreviousResult,
    pendingFeedbackResult,
    totalBudgetsResult,
    duoBudgetsResult,
    usersByRoleResult,
    dailyActiveResult,
    weeklyActiveResult,
    prevDailyActiveResult,
    prevWeeklyActiveResult,
    prevMonthlyActiveResult,
  ] = await Promise.all([
    // Total users (non-deleted)
    db
      .select({ count: sql<number>`COUNT(*)` })
      .from(users)
      .where(sql`${users.deletedAt} IS NULL`),

    // New signups in current period
    db
      .select({ count: sql<number>`COUNT(*)` })
      .from(users)
      .where(
        sql`${users.createdAt} >= ${periodStartISO}::timestamp AND ${users.deletedAt} IS NULL`
      ),

    // New signups in previous period
    db
      .select({ count: sql<number>`COUNT(*)` })
      .from(users)
      .where(
        sql`${users.createdAt} >= ${previousPeriodStartISO}::timestamp AND ${users.createdAt} < ${periodStartISO}::timestamp AND ${users.deletedAt} IS NULL`
      ),

    // Active users in current period (created at least 1 transaction)
    db.select({ count: sql<number>`COUNT(DISTINCT t.budget_id)` }).from(
      sql`transactions t
        JOIN budget_members bm ON bm.budget_id = t.budget_id AND bm.user_id IS NOT NULL
        JOIN app_user u ON u.id = bm.user_id AND u.deleted_at IS NULL
        WHERE t.created_at >= ${periodStartISO}::timestamp`
    ),

    // Active users in previous period
    db.select({ count: sql<number>`COUNT(DISTINCT t.budget_id)` }).from(
      sql`transactions t
        JOIN budget_members bm ON bm.budget_id = t.budget_id AND bm.user_id IS NOT NULL
        JOIN app_user u ON u.id = bm.user_id AND u.deleted_at IS NULL
        WHERE t.created_at >= ${previousPeriodStartISO}::timestamp AND t.created_at < ${periodStartISO}::timestamp`
    ),

    // Transactions created in current period
    db
      .select({ count: sql<number>`COUNT(*)` })
      .from(transactions)
      .where(sql`${transactions.createdAt} >= ${periodStartISO}::timestamp`),

    // Transactions created in previous period
    db
      .select({ count: sql<number>`COUNT(*)` })
      .from(transactions)
      .where(
        sql`${transactions.createdAt} >= ${previousPeriodStartISO}::timestamp AND ${transactions.createdAt} < ${periodStartISO}::timestamp`
      ),

    // Telegram users in current period (distinct users who sent messages)
    db
      .select({ count: sql<number>`COUNT(DISTINCT ${telegramAILogs.userId})` })
      .from(telegramAILogs)
      .where(
        sql`${telegramAILogs.createdAt} >= ${periodStartISO}::timestamp`
      ),

    // Telegram users in previous period
    db
      .select({ count: sql<number>`COUNT(DISTINCT ${telegramAILogs.userId})` })
      .from(telegramAILogs)
      .where(
        sql`${telegramAILogs.createdAt} >= ${previousPeriodStartISO}::timestamp AND ${telegramAILogs.createdAt} < ${periodStartISO}::timestamp`
      ),

    // Users who completed onboarding in current period
    db
      .select({ count: sql<number>`COUNT(*)` })
      .from(users)
      .where(
        sql`${users.onboardingCompletedAt} >= ${periodStartISO}::timestamp AND ${users.deletedAt} IS NULL`
      ),

    // Users who completed onboarding in previous period
    db
      .select({ count: sql<number>`COUNT(*)` })
      .from(users)
      .where(
        sql`${users.onboardingCompletedAt} >= ${previousPeriodStartISO}::timestamp AND ${users.onboardingCompletedAt} < ${periodStartISO}::timestamp AND ${users.deletedAt} IS NULL`
      ),

    // Pending feedback count
    db
      .select({ count: sql<number>`COUNT(*)` })
      .from(feedbacks)
      .where(sql`${feedbacks.status} = 'new'`),

    // Total budgets
    db.select({ count: sql<number>`COUNT(DISTINCT budget_id)` }).from(budgetMembers),

    // Duo budgets (budgets with more than 1 user-linked member)
    db.select({ count: sql<number>`COUNT(*)` }).from(
      sql`(
        SELECT budget_id FROM budget_members
        WHERE user_id IS NOT NULL
        GROUP BY budget_id
        HAVING COUNT(*) > 1
      ) duo`
    ),

    // Users by role
    db
      .select({
        role: users.role,
        count: sql<number>`COUNT(*)`,
      })
      .from(users)
      .where(sql`${users.deletedAt} IS NULL`)
      .groupBy(users.role),

    // Daily active users (today) - distinct users with transactions today
    db.select({ count: sql<number>`COUNT(DISTINCT bm.user_id)` }).from(
      sql`transactions t
        JOIN budget_members bm ON bm.budget_id = t.budget_id AND bm.user_id IS NOT NULL
        WHERE t.created_at >= ${startOfDay(now).toISOString()}::timestamp`
    ),

    // Weekly active users - distinct users with transactions this week
    db.select({ count: sql<number>`COUNT(DISTINCT bm.user_id)` }).from(
      sql`transactions t
        JOIN budget_members bm ON bm.budget_id = t.budget_id AND bm.user_id IS NOT NULL
        WHERE t.created_at >= ${startOfDay(subDays(now, 7)).toISOString()}::timestamp`
    ),

    // Previous day active users (yesterday)
    db.select({ count: sql<number>`COUNT(DISTINCT bm.user_id)` }).from(
      sql`transactions t
        JOIN budget_members bm ON bm.budget_id = t.budget_id AND bm.user_id IS NOT NULL
        WHERE t.created_at >= ${startOfDay(subDays(now, 1)).toISOString()}::timestamp
        AND t.created_at < ${startOfDay(now).toISOString()}::timestamp`
    ),

    // Previous week active users (7-14 days ago)
    db.select({ count: sql<number>`COUNT(DISTINCT bm.user_id)` }).from(
      sql`transactions t
        JOIN budget_members bm ON bm.budget_id = t.budget_id AND bm.user_id IS NOT NULL
        WHERE t.created_at >= ${startOfDay(subDays(now, 14)).toISOString()}::timestamp
        AND t.created_at < ${startOfDay(subDays(now, 7)).toISOString()}::timestamp`
    ),

    // Previous month active users (30-60 days ago)
    db.select({ count: sql<number>`COUNT(DISTINCT bm.user_id)` }).from(
      sql`transactions t
        JOIN budget_members bm ON bm.budget_id = t.budget_id AND bm.user_id IS NOT NULL
        WHERE t.created_at >= ${startOfDay(subDays(now, 60)).toISOString()}::timestamp
        AND t.created_at < ${startOfDay(subDays(now, 30)).toISOString()}::timestamp`
    ),
  ]);

  const totalUsers_n = Number(totalUsersResult[0].count);
  const newUsersCurrent = Number(newUsersCurrentResult[0].count);
  const newUsersPrevious = Number(newUsersPreviousResult[0].count);
  const activeUsersCurrent = Number(activeUsersCurrentResult[0].count);
  const activeUsersPrevious = Number(activeUsersPreviousResult[0].count);
  const transactionsCurrent = Number(transactionsCurrentResult[0].count);
  const transactionsPrevious = Number(transactionsPreviousResult[0].count);
  const telegramUsersCurrent = Number(telegramUsersCurrentResult[0].count);
  const telegramUsersPrevious = Number(telegramUsersPreviousResult[0].count);
  const onboardingCurrent = Number(onboardingCompletedResult[0].count);
  const onboardingPrevious = Number(onboardingCompletedPreviousResult[0].count);

  const calcDelta = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100);
  };

  const roleMap: Record<string, number> = {};
  for (const r of usersByRoleResult) {
    roleMap[r.role || "user"] = Number(r.count);
  }

  return NextResponse.json({
    data: {
      period: { days },
      kpis: {
        totalUsers: totalUsers_n,
        newUsers: {
          current: newUsersCurrent,
          previous: newUsersPrevious,
          delta: calcDelta(newUsersCurrent, newUsersPrevious),
        },
        activeUsers: {
          current: activeUsersCurrent,
          previous: activeUsersPrevious,
          delta: calcDelta(activeUsersCurrent, activeUsersPrevious),
        },
        transactions: {
          current: transactionsCurrent,
          previous: transactionsPrevious,
          delta: calcDelta(transactionsCurrent, transactionsPrevious),
        },
        telegramUsers: {
          current: telegramUsersCurrent,
          previous: telegramUsersPrevious,
          delta: calcDelta(telegramUsersCurrent, telegramUsersPrevious),
        },
        onboardingCompleted: {
          current: onboardingCurrent,
          previous: onboardingPrevious,
          delta: calcDelta(onboardingCurrent, onboardingPrevious),
        },
        pendingFeedback: Number(pendingFeedbackResult[0].count),
      },
      activity: {
        dau: { current: Number(dailyActiveResult[0].count), previous: Number(prevDailyActiveResult[0].count), delta: calcDelta(Number(dailyActiveResult[0].count), Number(prevDailyActiveResult[0].count)) },
        wau: { current: Number(weeklyActiveResult[0].count), previous: Number(prevWeeklyActiveResult[0].count), delta: calcDelta(Number(weeklyActiveResult[0].count), Number(prevWeeklyActiveResult[0].count)) },
        mau: { current: activeUsersCurrent, previous: Number(prevMonthlyActiveResult[0].count), delta: calcDelta(activeUsersCurrent, Number(prevMonthlyActiveResult[0].count)) },
      },
      budgets: {
        total: Number(totalBudgetsResult[0].count),
        duo: Number(duoBudgetsResult[0].count),
        solo: Number(totalBudgetsResult[0].count) - Number(duoBudgetsResult[0].count),
      },
      usersByRole: roleMap,
    },
  });
});
