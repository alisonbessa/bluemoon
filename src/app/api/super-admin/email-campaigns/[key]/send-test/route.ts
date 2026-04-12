import { NextResponse } from "next/server";
import { z } from "zod";
import withSuperAdminAuthRequired from "@/shared/lib/auth/withSuperAdminAuthRequired";
import sendMail from "@/shared/lib/email/sendMail";
import { createLogger } from "@/shared/lib/logger";
import { CAMPAIGNS_REGISTRY, CAMPAIGN_KEYS } from "@/shared/lib/email/campaigns-registry";
import { createUnsubscribeToken } from "@/shared/lib/email/unsubscribe-token";
import { appConfig } from "@/shared/lib/config";
import type { CampaignKey } from "@/db/schema/email-campaigns";

const logger = createLogger("api:admin:email-campaigns:send-test");

const schema = z.object({
  email: z.string().email().optional(),
});

/**
 * POST /api/super-admin/email-campaigns/[key]/send-test
 *
 * Sends a one-off test render of the campaign to an email address (defaults
 * to the admin's own email). Marked with a "[TESTE]" subject prefix and
 * NOT recorded in email_campaign_sends, so it does not interact with the
 * per-user dedupe or throttle logic.
 */
export const POST = withSuperAdminAuthRequired(async (req, { session, params }) => {
  const awaited = await params;
  const key = awaited.key as CampaignKey;

  if (!CAMPAIGN_KEYS.includes(key)) {
    return NextResponse.json({ error: "unknown_campaign" }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_body", message: parsed.error.message },
      { status: 400 }
    );
  }

  const targetEmail = parsed.data.email ?? session.user?.email;
  if (!targetEmail) {
    return NextResponse.json(
      { error: "missing_email", message: "Informe um e-mail ou associe um ao admin." },
      { status: 400 }
    );
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const meta = CAMPAIGNS_REGISTRY[key];

  // Use admin's own userId for the unsub token so clicking "unsubscribe"
  // in a test email affects the tester, not a real user.
  const unsubscribeUserId = session.user?.id ?? "test-admin";
  const unsubscribeUrl = `${appUrl}/api/unsubscribe?token=${createUnsubscribeToken(unsubscribeUserId)}`;

  const html = await meta.render({
    userName: "Admin",
    appUrl,
    unsubscribeUrl,
    replyMailto: `mailto:${appConfig.legal.email}`,
  });

  try {
    await sendMail(targetEmail, `[TESTE] ${meta.defaultSubject}`, html);
    logger.info("Sent test campaign email", {
      campaignKey: key,
      target: targetEmail,
      byAdmin: session.user?.id ?? null,
    });
    return NextResponse.json({ ok: true, sentTo: targetEmail });
  } catch (error) {
    logger.error("Failed to send test campaign email", error, {
      campaignKey: key,
      target: targetEmail,
    });
    return NextResponse.json(
      {
        error: "send_failed",
        message: error instanceof Error ? error.message : "Erro ao enviar",
      },
      { status: 500 }
    );
  }
});
