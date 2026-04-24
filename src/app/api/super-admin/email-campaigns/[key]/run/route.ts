import { NextResponse } from "next/server";
import withSuperAdminAuthRequired from "@/shared/lib/auth/withSuperAdminAuthRequired";
import { CAMPAIGN_KEYS } from "@/shared/lib/email/campaigns-registry";
import {
  dispatchSingleCampaign,
  isManualDispatchable,
} from "@/shared/lib/email/manual-dispatch";
import { createLogger } from "@/shared/lib/logger";
import type { CampaignKey } from "@/db/schema/email-campaigns";

const logger = createLogger("api:admin:email-campaigns:run");

/**
 * POST /api/super-admin/email-campaigns/[key]/run
 *
 * Dispatches a single campaign to its manual cohort. Intended for one-off
 * incident emails that aren't part of the daily retention cron. The
 * unique(user, campaign) constraint guarantees a given user receives each
 * campaign at most once, so re-clicking the button is safe.
 */
export const POST = withSuperAdminAuthRequired(async (_req, { session, params }) => {
  const awaited = await params;
  const key = awaited.key as CampaignKey;

  if (!CAMPAIGN_KEYS.includes(key)) {
    return NextResponse.json({ error: "unknown_campaign" }, { status: 404 });
  }

  if (!isManualDispatchable(key)) {
    return NextResponse.json(
      {
        error: "not_manual_dispatchable",
        message:
          "Esta campanha não tem cohort de disparo manual. Use o cron diário (Executar agora).",
      },
      { status: 400 }
    );
  }

  try {
    const result = await dispatchSingleCampaign(key);
    logger.info("Manual campaign dispatch", {
      campaignKey: key,
      byAdmin: session.user?.id ?? null,
      result,
    });
    return NextResponse.json({ ok: true, result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro inesperado";
    logger.error("Manual campaign dispatch failed", error, { campaignKey: key });
    return NextResponse.json(
      { error: "dispatch_failed", message },
      { status: 500 }
    );
  }
});
