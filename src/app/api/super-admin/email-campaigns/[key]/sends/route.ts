import { NextResponse } from "next/server";
import withSuperAdminAuthRequired from "@/shared/lib/auth/withSuperAdminAuthRequired";
import { db } from "@/db";
import { emailCampaignSends, type CampaignKey } from "@/db/schema/email-campaigns";
import { users } from "@/db/schema/user";
import { desc, eq, sql } from "drizzle-orm";
import { CAMPAIGN_KEYS } from "@/shared/lib/email/campaigns-registry";

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

/**
 * GET /api/super-admin/email-campaigns/[key]/sends?page=1&limit=20
 *
 * Returns recent recipients for a campaign with user info and status.
 */
export const GET = withSuperAdminAuthRequired(async (req, { params }) => {
  const awaited = await params;
  const key = awaited.key as CampaignKey;

  if (!CAMPAIGN_KEYS.includes(key)) {
    return NextResponse.json({ error: "unknown_campaign" }, { status: 404 });
  }

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const limit = Math.min(
    MAX_LIMIT,
    Math.max(1, parseInt(searchParams.get("limit") || String(DEFAULT_LIMIT), 10))
  );
  const offset = (page - 1) * limit;

  const [totalRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(emailCampaignSends)
    .where(eq(emailCampaignSends.campaignKey, key));
  const total = totalRow?.count ?? 0;

  const rows = await db
    .select({
      id: emailCampaignSends.id,
      userId: emailCampaignSends.userId,
      status: emailCampaignSends.status,
      errorMessage: emailCampaignSends.errorMessage,
      sentAt: emailCampaignSends.sentAt,
      userName: users.name,
      userEmail: users.email,
    })
    .from(emailCampaignSends)
    .leftJoin(users, eq(users.id, emailCampaignSends.userId))
    .where(eq(emailCampaignSends.campaignKey, key))
    .orderBy(desc(emailCampaignSends.sentAt))
    .limit(limit)
    .offset(offset);

  return NextResponse.json({
    sends: rows,
    pagination: {
      page,
      limit,
      total,
      pageCount: Math.max(1, Math.ceil(total / limit)),
    },
  });
});
