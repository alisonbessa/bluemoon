import { NextResponse } from "next/server";
import withSuperAdminAuthRequired from "@/shared/lib/auth/withSuperAdminAuthRequired";
import { CAMPAIGN_KEYS } from "@/shared/lib/email/campaigns-registry";
import {
  isManualDispatchable,
  previewSingleCampaignCohort,
} from "@/shared/lib/email/manual-dispatch";
import { createLogger } from "@/shared/lib/logger";
import type { CampaignKey } from "@/db/schema/email-campaigns";

const logger = createLogger("api:admin:email-campaigns:recipients");

/**
 * GET /api/super-admin/email-campaigns/[key]/recipients
 *
 * Returns the current cohort for a manual-dispatch campaign, annotated with
 * each user's status so the admin can preview who will actually receive the
 * email before clicking "Disparar".
 */
export const GET = withSuperAdminAuthRequired(async (_req, { params }) => {
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
          "Esta campanha não tem cohort de disparo manual. Use o cron diário.",
      },
      { status: 400 }
    );
  }

  try {
    const recipients = await previewSingleCampaignCohort(key);
    const summary = {
      total: recipients.length,
      willSend: recipients.filter((r) => r.status === "will_send").length,
      alreadySent: recipients.filter((r) => r.status === "already_sent").length,
      unsubscribed: recipients.filter((r) => r.status === "unsubscribed").length,
    };
    return NextResponse.json({ recipients, summary });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro inesperado";
    logger.error("Recipients preview failed", error, { campaignKey: key });
    return NextResponse.json(
      { error: "preview_failed", message },
      { status: 500 }
    );
  }
});
