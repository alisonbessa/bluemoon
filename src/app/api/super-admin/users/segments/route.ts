import { NextRequest, NextResponse } from "next/server";
import withSuperAdminAuthRequired from "@/shared/lib/auth/withSuperAdminAuthRequired";
import { db } from "@/db";
import { sql } from "drizzle-orm";

/**
 * GET /api/super-admin/users/segments
 *
 * Query params:
 *   segment: "power" | "active" | "inactive" | "new_inactive" | "never_active"
 *   days: number (default 30) - defines the time window
 *   page: number (default 1)
 *   limit: number (default 50)
 *
 * Returns paginated user list for the selected segment with activity stats.
 */
export const GET = withSuperAdminAuthRequired(async (req: NextRequest) => {
  const { searchParams } = new URL(req.url);
  const segment = searchParams.get("segment") || "active";
  const days = Math.min(Number(searchParams.get("days") || "30"), 365);
  const page = Math.max(Number(searchParams.get("page") || "1"), 1);
  const limit = Math.min(Number(searchParams.get("limit") || "50"), 100);
  const offset = (page - 1) * limit;

  const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  // Build segment-specific query
  let segmentQuery: string;

  switch (segment) {
    case "power":
      // Users with 20+ transactions in the period
      segmentQuery = `
        SELECT u.id, u.name, u.email, u.image, u.role, u."createdAt",
          COUNT(t.id)::int AS tx_count,
          MAX(t.created_at) AS last_active
        FROM app_user u
        JOIN budget_members bm ON bm.user_id = u.id
        JOIN transactions t ON t.budget_id = bm.budget_id AND t.created_at >= '${cutoffDate}'::timestamp
        WHERE u.deleted_at IS NULL
        GROUP BY u.id
        HAVING COUNT(t.id) >= 20
        ORDER BY tx_count DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
      break;

    case "active":
      // Users with at least 1 transaction in the period
      segmentQuery = `
        SELECT u.id, u.name, u.email, u.image, u.role, u."createdAt",
          COUNT(t.id)::int AS tx_count,
          MAX(t.created_at) AS last_active
        FROM app_user u
        JOIN budget_members bm ON bm.user_id = u.id
        JOIN transactions t ON t.budget_id = bm.budget_id AND t.created_at >= '${cutoffDate}'::timestamp
        WHERE u.deleted_at IS NULL
        GROUP BY u.id
        ORDER BY tx_count DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
      break;

    case "inactive":
      // Users who signed up before the period but have no transactions in it
      segmentQuery = `
        SELECT u.id, u.name, u.email, u.image, u.role, u."createdAt",
          0 AS tx_count,
          (
            SELECT MAX(t2.created_at) FROM transactions t2
            JOIN budget_members bm2 ON bm2.budget_id = t2.budget_id
            WHERE bm2.user_id = u.id
          ) AS last_active
        FROM app_user u
        WHERE u.deleted_at IS NULL
          AND u."createdAt" < '${cutoffDate}'::timestamp
          AND NOT EXISTS (
            SELECT 1 FROM transactions t
            JOIN budget_members bm ON bm.budget_id = t.budget_id AND bm.user_id = u.id
            WHERE t.created_at >= '${cutoffDate}'::timestamp
          )
        ORDER BY u."createdAt" DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
      break;

    case "new_inactive":
      // Users who signed up in the period but never created a transaction
      segmentQuery = `
        SELECT u.id, u.name, u.email, u.image, u.role, u."createdAt",
          0 AS tx_count,
          NULL AS last_active
        FROM app_user u
        WHERE u.deleted_at IS NULL
          AND u."createdAt" >= '${cutoffDate}'::timestamp
          AND NOT EXISTS (
            SELECT 1 FROM transactions t
            JOIN budget_members bm ON bm.budget_id = t.budget_id AND bm.user_id = u.id
          )
        ORDER BY u."createdAt" DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
      break;

    case "never_active":
      // All users who never created a single transaction
      segmentQuery = `
        SELECT u.id, u.name, u.email, u.image, u.role, u."createdAt",
          0 AS tx_count,
          NULL AS last_active
        FROM app_user u
        WHERE u.deleted_at IS NULL
          AND NOT EXISTS (
            SELECT 1 FROM transactions t
            JOIN budget_members bm ON bm.budget_id = t.budget_id AND bm.user_id = u.id
          )
        ORDER BY u."createdAt" DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
      break;

    default:
      return NextResponse.json({ error: "Invalid segment" }, { status: 400 });
  }

  // Count query for pagination
  let countQuery: string;
  switch (segment) {
    case "power":
      countQuery = `
        SELECT COUNT(*) AS total FROM (
          SELECT bm.user_id FROM transactions t
          JOIN budget_members bm ON bm.budget_id = t.budget_id AND bm.user_id IS NOT NULL
          JOIN app_user u ON u.id = bm.user_id AND u.deleted_at IS NULL
          WHERE t.created_at >= '${cutoffDate}'::timestamp
          GROUP BY bm.user_id HAVING COUNT(t.id) >= 20
        ) sub
      `;
      break;
    case "active":
      countQuery = `
        SELECT COUNT(DISTINCT bm.user_id) AS total FROM transactions t
        JOIN budget_members bm ON bm.budget_id = t.budget_id AND bm.user_id IS NOT NULL
        JOIN app_user u ON u.id = bm.user_id AND u.deleted_at IS NULL
        WHERE t.created_at >= '${cutoffDate}'::timestamp
      `;
      break;
    case "inactive":
      countQuery = `
        SELECT COUNT(*) AS total FROM app_user u
        WHERE u.deleted_at IS NULL
          AND u."createdAt" < '${cutoffDate}'::timestamp
          AND NOT EXISTS (
            SELECT 1 FROM transactions t
            JOIN budget_members bm ON bm.budget_id = t.budget_id AND bm.user_id = u.id
            WHERE t.created_at >= '${cutoffDate}'::timestamp
          )
      `;
      break;
    case "new_inactive":
      countQuery = `
        SELECT COUNT(*) AS total FROM app_user u
        WHERE u.deleted_at IS NULL
          AND u."createdAt" >= '${cutoffDate}'::timestamp
          AND NOT EXISTS (
            SELECT 1 FROM transactions t
            JOIN budget_members bm ON bm.budget_id = t.budget_id AND bm.user_id = u.id
          )
      `;
      break;
    case "never_active":
      countQuery = `
        SELECT COUNT(*) AS total FROM app_user u
        WHERE u.deleted_at IS NULL
          AND NOT EXISTS (
            SELECT 1 FROM transactions t
            JOIN budget_members bm ON bm.budget_id = t.budget_id AND bm.user_id = u.id
          )
      `;
      break;
    default:
      countQuery = "SELECT 0 AS total";
  }

  const [usersResult, countResult] = await Promise.all([
    db.execute(sql.raw(segmentQuery)),
    db.execute(sql.raw(countQuery)),
  ]);

  const total = Number((countResult.rows[0] as { total: string }).total);

  return NextResponse.json({
    users: usersResult.rows,
    segment,
    days,
    pagination: {
      total,
      pageCount: Math.ceil(total / limit),
      currentPage: page,
      perPage: limit,
    },
  });
});
