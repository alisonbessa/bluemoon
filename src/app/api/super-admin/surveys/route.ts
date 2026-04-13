import { NextResponse } from "next/server";
import withSuperAdminAuthRequired from "@/shared/lib/auth/withSuperAdminAuthRequired";
import { db } from "@/db";
import { betaSurveys } from "@/db/schema/email-campaigns";
import { users } from "@/db/schema/user";
import { desc, eq, sql, and, type SQL } from "drizzle-orm";

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

/**
 * GET /api/super-admin/surveys?surveyKey=power-user-v1&page=1&limit=20
 *
 * Returns survey responses with the responder's name and email. Default
 * sort is most-recent first.
 */
export const GET = withSuperAdminAuthRequired(async (req) => {
  const { searchParams } = new URL(req.url);
  const surveyKey = searchParams.get("surveyKey");
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const limit = Math.min(
    MAX_LIMIT,
    Math.max(1, parseInt(searchParams.get("limit") || String(DEFAULT_LIMIT), 10))
  );
  const offset = (page - 1) * limit;

  const conditions: SQL[] = [];
  if (surveyKey) conditions.push(eq(betaSurveys.surveyKey, surveyKey));
  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [totalRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(betaSurveys)
    .where(whereClause);
  const total = totalRow?.count ?? 0;

  const rows = await db
    .select({
      id: betaSurveys.id,
      surveyKey: betaSurveys.surveyKey,
      userId: betaSurveys.userId,
      nps: betaSurveys.nps,
      likes: betaSurveys.likes,
      missing: betaSurveys.missing,
      acceptsFollowUpEmails: betaSurveys.acceptsFollowUpEmails,
      createdAt: betaSurveys.createdAt,
      userName: users.name,
      userEmail: users.email,
    })
    .from(betaSurveys)
    .leftJoin(users, eq(users.id, betaSurveys.userId))
    .where(whereClause)
    .orderBy(desc(betaSurveys.createdAt))
    .limit(limit)
    .offset(offset);

  // Aggregate stats
  const [statsRow] = await db
    .select({
      total: sql<number>`count(*)::int`,
      avgNps: sql<number>`avg(${betaSurveys.nps})::float`,
      promoters: sql<number>`count(*) filter (where ${betaSurveys.nps} >= 9)::int`,
      passives: sql<number>`count(*) filter (where ${betaSurveys.nps} between 7 and 8)::int`,
      detractors: sql<number>`count(*) filter (where ${betaSurveys.nps} <= 6)::int`,
      followUpOptIns: sql<number>`count(*) filter (where ${betaSurveys.acceptsFollowUpEmails} = true)::int`,
    })
    .from(betaSurveys)
    .where(whereClause);

  return NextResponse.json({
    surveys: rows,
    pagination: {
      page,
      limit,
      total,
      pageCount: Math.max(1, Math.ceil(total / limit)),
    },
    stats: statsRow ?? {
      total: 0,
      avgNps: null,
      promoters: 0,
      passives: 0,
      detractors: 0,
      followUpOptIns: 0,
    },
  });
});
