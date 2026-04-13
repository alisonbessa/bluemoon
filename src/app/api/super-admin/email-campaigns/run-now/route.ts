import { NextResponse } from "next/server";
import withSuperAdminAuthRequired from "@/shared/lib/auth/withSuperAdminAuthRequired";
import { executeRetentionCampaigns } from "@/shared/lib/email/retention-runner";
import { createLogger } from "@/shared/lib/logger";

const logger = createLogger("api:admin:email-campaigns:run-now");

/**
 * POST /api/super-admin/email-campaigns/run-now
 *
 * Manually runs the retention campaigns pipeline right now. Equivalent to
 * what the daily Inngest cron does, but usable without the Inngest dev
 * server running locally or waiting for the next scheduled run in prod.
 *
 * All safeguards still apply: unique(user, campaign), 3-day throttle,
 * per-campaign enabled flag, and per-user unsubscribe.
 */
export const POST = withSuperAdminAuthRequired(async (_req, { session }) => {
  try {
    const result = await executeRetentionCampaigns();
    logger.info("Retention campaigns ran manually", {
      by: session.user?.id ?? null,
      considered: result.considered,
      eligible: result.eligible,
      errors: result.errors,
    });
    return NextResponse.json({ ok: true, result });
  } catch (error) {
    logger.error("Manual retention run failed", error);
    return NextResponse.json(
      {
        error: "run_failed",
        message: error instanceof Error ? error.message : "Erro inesperado",
      },
      { status: 500 }
    );
  }
});
