import { NextRequest, NextResponse } from "next/server";
import withSuperAdminAuthRequired from "@/shared/lib/auth/withSuperAdminAuthRequired";
import { db } from "@/db";
import { sql } from "drizzle-orm";

export const GET = withSuperAdminAuthRequired(async (req: NextRequest) => {
  const { searchParams } = new URL(req.url);
  const months = Math.min(Number(searchParams.get("months") || "6"), 12);

  // Cohort retention analysis
  // For each signup month, what % of users were active in subsequent months
  const cohortData = await db.execute(sql`
    WITH user_cohorts AS (
      SELECT
        u.id AS user_id,
        DATE_TRUNC('month', u."createdAt")::date AS cohort_month
      FROM app_user u
      WHERE u.deleted_at IS NULL
        AND u."createdAt" >= NOW() - INTERVAL '${sql.raw(String(months))} months'
    ),
    user_activity AS (
      SELECT DISTINCT
        bm.user_id,
        DATE_TRUNC('month', t.created_at)::date AS activity_month
      FROM transactions t
      JOIN budget_members bm ON bm.budget_id = t.budget_id AND bm.user_id IS NOT NULL
      WHERE t.created_at >= NOW() - INTERVAL '${sql.raw(String(months))} months'
    ),
    cohort_sizes AS (
      SELECT cohort_month, COUNT(*) AS cohort_size
      FROM user_cohorts
      GROUP BY cohort_month
    ),
    cohort_activity AS (
      SELECT
        uc.cohort_month,
        ua.activity_month,
        COUNT(DISTINCT uc.user_id) AS active_users
      FROM user_cohorts uc
      JOIN user_activity ua ON ua.user_id = uc.user_id
      WHERE ua.activity_month >= uc.cohort_month
      GROUP BY uc.cohort_month, ua.activity_month
    )
    SELECT
      TO_CHAR(cs.cohort_month, 'YYYY-MM') AS cohort,
      cs.cohort_size,
      TO_CHAR(ca.activity_month, 'YYYY-MM') AS activity_month,
      COALESCE(ca.active_users, 0) AS active_users
    FROM cohort_sizes cs
    LEFT JOIN cohort_activity ca ON ca.cohort_month = cs.cohort_month
    ORDER BY cs.cohort_month, ca.activity_month
  `);

  // Transform into a structured cohort table
  const cohortMap = new Map<
    string,
    { cohortSize: number; months: Record<string, number> }
  >();

  for (const row of cohortData.rows as Array<{
    cohort: string;
    cohort_size: string;
    activity_month: string | null;
    active_users: string;
  }>) {
    if (!cohortMap.has(row.cohort)) {
      cohortMap.set(row.cohort, {
        cohortSize: Number(row.cohort_size),
        months: {},
      });
    }
    if (row.activity_month) {
      cohortMap.get(row.cohort)!.months[row.activity_month] = Number(
        row.active_users
      );
    }
  }

  const cohorts = Array.from(cohortMap.entries()).map(
    ([cohort, { cohortSize, months }]) => ({
      cohort,
      cohortSize,
      retention: months,
    })
  );

  // Conversion metrics: access link usage and plan adoption
  const [conversionResult, inactiveUsersResult] = await Promise.all([
    db.execute(sql`
      SELECT
        (SELECT COUNT(*) FROM app_user WHERE deleted_at IS NULL) AS total_users,
        (SELECT COUNT(*) FROM app_user WHERE deleted_at IS NULL AND onboarding_completed_at IS NOT NULL) AS onboarded,
        (SELECT COUNT(*) FROM app_user WHERE deleted_at IS NULL AND "planId" IS NOT NULL) AS with_plan,
        (SELECT COUNT(*) FROM app_user WHERE deleted_at IS NULL AND role = 'beta') AS beta_users,
        (SELECT COUNT(*) FROM app_user WHERE deleted_at IS NULL AND role = 'lifetime') AS lifetime_users,
        (SELECT COUNT(*) FROM app_user WHERE deleted_at IS NULL AND "stripeSubscriptionId" IS NOT NULL) AS stripe_subscribers,
        (SELECT COUNT(*) FROM access_links WHERE used_at IS NOT NULL) AS access_links_used,
        (SELECT COUNT(*) FROM access_links WHERE used_at IS NULL AND expired = false) AS access_links_available,
        (SELECT COUNT(*) FROM coupon WHERE "usedAt" IS NOT NULL) AS coupons_used,
        (SELECT COUNT(*) FROM coupon WHERE "usedAt" IS NULL AND expired = false) AS coupons_available,
        (SELECT COUNT(*) FROM app_user WHERE deleted_at IS NOT NULL) AS deleted_users,
        (SELECT COUNT(*) FROM app_user WHERE deletion_requested_at IS NOT NULL AND deleted_at IS NULL) AS pending_deletion
    `),

    // Users inactive for 30+ days (no transactions in last 30 days, but signed up before that)
    db.execute(sql`
      SELECT COUNT(DISTINCT u.id) AS inactive_count
      FROM app_user u
      JOIN budget_members bm ON bm.user_id = u.id
      WHERE u.deleted_at IS NULL
        AND u."createdAt" < NOW() - INTERVAL '30 days'
        AND NOT EXISTS (
          SELECT 1 FROM transactions t
          WHERE t.budget_id = bm.budget_id
            AND t.created_at >= NOW() - INTERVAL '30 days'
        )
    `),
  ]);

  const conv = conversionResult.rows[0] as Record<string, string>;
  const inactiveCount = Number(
    (inactiveUsersResult.rows[0] as { inactive_count: string }).inactive_count
  );

  return NextResponse.json({
    data: {
      cohorts,
      conversion: {
        totalUsers: Number(conv.total_users),
        onboarded: Number(conv.onboarded),
        withPlan: Number(conv.with_plan),
        betaUsers: Number(conv.beta_users),
        lifetimeUsers: Number(conv.lifetime_users),
        stripeSubscribers: Number(conv.stripe_subscribers),
        accessLinksUsed: Number(conv.access_links_used),
        accessLinksAvailable: Number(conv.access_links_available),
        couponsUsed: Number(conv.coupons_used),
        couponsAvailable: Number(conv.coupons_available),
        deletedUsers: Number(conv.deleted_users),
        pendingDeletion: Number(conv.pending_deletion),
      },
      inactiveUsers30d: inactiveCount,
    },
  });
});
