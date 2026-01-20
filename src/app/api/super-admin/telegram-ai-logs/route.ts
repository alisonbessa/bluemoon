import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { telegramAILogs, users } from "@/db/schema";
import { eq, desc, and, sql, gte, lte } from "drizzle-orm";
import withSuperAdminAuthRequired from "@/shared/lib/auth/withSuperAdminAuthRequired";
import { getAIPerformanceStats } from "@/shared/lib/telegram/ai-logger";

// GET - List AI logs with filtering and stats
export const GET = withSuperAdminAuthRequired(async (req: NextRequest) => {
  const url = new URL(req.url);
  const page = parseInt(url.searchParams.get("page") || "1");
  const limit = parseInt(url.searchParams.get("limit") || "50");
  const filter = url.searchParams.get("filter") || "all"; // all, unknown, low_confidence, corrected
  const startDate = url.searchParams.get("startDate");
  const endDate = url.searchParams.get("endDate");

  const offset = (page - 1) * limit;

  // Build conditions
  const conditions = [];

  if (filter === "unknown") {
    conditions.push(eq(telegramAILogs.isUnknownIntent, true));
  } else if (filter === "low_confidence") {
    conditions.push(eq(telegramAILogs.isLowConfidence, true));
  } else if (filter === "corrected") {
    conditions.push(eq(telegramAILogs.resolution, "corrected"));
  } else if (filter === "pending") {
    conditions.push(eq(telegramAILogs.resolution, "pending"));
  }

  if (startDate) {
    conditions.push(gte(telegramAILogs.createdAt, new Date(startDate)));
  }

  if (endDate) {
    conditions.push(lte(telegramAILogs.createdAt, new Date(endDate)));
  }

  // Get logs with user info
  const logsQuery = db
    .select({
      log: telegramAILogs,
      userName: users.name,
      userEmail: users.email,
    })
    .from(telegramAILogs)
    .leftJoin(users, eq(telegramAILogs.userId, users.id))
    .orderBy(desc(telegramAILogs.createdAt))
    .limit(limit)
    .offset(offset);

  const logs =
    conditions.length > 0
      ? await logsQuery.where(and(...conditions))
      : await logsQuery;

  // Get total count for pagination
  const countQuery = db
    .select({ count: sql<number>`count(*)::int` })
    .from(telegramAILogs);

  const [{ count: total }] =
    conditions.length > 0
      ? await countQuery.where(and(...conditions))
      : await countQuery;

  // Get performance stats
  const stats = await getAIPerformanceStats();

  // Get intent distribution
  const intentDistribution = await db
    .select({
      intent: sql<string>`ai_response->>'intent'`,
      count: sql<number>`count(*)::int`,
    })
    .from(telegramAILogs)
    .groupBy(sql`ai_response->>'intent'`)
    .orderBy(desc(sql`count(*)`));

  // Get common corrections (to identify patterns)
  const commonCorrections = await db
    .select({
      originalMessage: telegramAILogs.originalMessage,
      aiIntent: sql<string>`ai_response->>'intent'`,
      correctedCategoryId: telegramAILogs.correctedCategoryId,
      count: sql<number>`count(*)::int`,
    })
    .from(telegramAILogs)
    .where(eq(telegramAILogs.resolution, "corrected"))
    .groupBy(
      telegramAILogs.originalMessage,
      sql`ai_response->>'intent'`,
      telegramAILogs.correctedCategoryId
    )
    .orderBy(desc(sql`count(*)`))
    .limit(10);

  return NextResponse.json({
    logs: logs.map((l) => ({
      ...l.log,
      userName: l.userName,
      userEmail: l.userEmail,
    })),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
    stats,
    intentDistribution,
    commonCorrections,
  });
});

// DELETE - Clear old logs (keep last 30 days)
export const DELETE = withSuperAdminAuthRequired(async () => {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const result = await db
    .delete(telegramAILogs)
    .where(
      and(
        lte(telegramAILogs.createdAt, thirtyDaysAgo),
        // Keep corrected logs for training purposes
        sql`${telegramAILogs.resolution} != 'corrected'`
      )
    )
    .returning();

  return NextResponse.json({
    deleted: result.length,
    message: `Deleted ${result.length} old logs (kept corrected logs for training)`,
  });
});
