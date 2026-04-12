import { NextResponse } from "next/server";
import withSuperAdminAuthRequired from "@/shared/lib/auth/withSuperAdminAuthRequired";
import { CAMPAIGNS_REGISTRY, CAMPAIGN_KEYS } from "@/shared/lib/email/campaigns-registry";
import type { CampaignKey } from "@/db/schema/email-campaigns";

/**
 * Returns fully-rendered HTML of a campaign email with mock data.
 * Used by the super-admin UI to preview emails in an iframe.
 */
export const GET = withSuperAdminAuthRequired(async (_req, { params }) => {
  const awaited = await params;
  const key = awaited.key as CampaignKey;

  if (!CAMPAIGN_KEYS.includes(key)) {
    return NextResponse.json({ error: "unknown_campaign" }, { status: 404 });
  }

  const html = await CAMPAIGNS_REGISTRY[key].renderPreview();
  return new NextResponse(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
});
