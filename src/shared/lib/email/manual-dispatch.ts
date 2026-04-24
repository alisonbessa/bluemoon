import { db } from "@/db";
import { users } from "@/db/schema/user";
import { invites } from "@/db/schema/invites";
import {
  emailCampaignConfigs,
  emailCampaignSends,
  type CampaignKey,
} from "@/db/schema/email-campaigns";
import { and, eq, gt, isNotNull, isNull, inArray } from "drizzle-orm";
import sendMail from "@/shared/lib/email/sendMail";
import { createLogger } from "@/shared/lib/logger";
import { appConfig } from "@/shared/lib/config";
import { createUnsubscribeToken } from "@/shared/lib/email/unsubscribe-token";
import { getFirstName } from "@/shared/lib/string-utils";
import { CAMPAIGNS_REGISTRY } from "@/shared/lib/email/campaigns-registry";
import { recordCampaignSend } from "@/shared/lib/email/campaign-eligibility";

const logger = createLogger("manual-campaign-dispatch");

type CohortUser = { id: string; email: string; name: string | null };
type CohortResolver = () => Promise<CohortUser[]>;

/**
 * Cohort resolvers for campaigns that can be dispatched manually (one-off)
 * from the super-admin UI. Campaigns that belong to the daily retention cron
 * don't need an entry here — those have their own inline cohorts in the
 * retention runner.
 */
const MANUAL_COHORTS: Partial<Record<CampaignKey, CohortResolver>> = {
  partner_invite_retry_incident: async () => {
    const rows = await db
      .selectDistinct({
        id: users.id,
        email: users.email,
        name: users.name,
      })
      .from(invites)
      .innerJoin(users, eq(users.id, invites.invitedByUserId))
      .where(
        and(
          eq(invites.status, "pending"),
          gt(invites.expiresAt, new Date()),
          isNull(users.deletedAt),
          isNotNull(users.email)
        )
      );
    return rows.filter((r): r is CohortUser => !!r.email);
  },
};

export function isManualDispatchable(key: CampaignKey): boolean {
  return key in MANUAL_COHORTS;
}

export type RecipientStatus = "will_send" | "already_sent" | "unsubscribed";

export interface RecipientRow {
  id: string;
  email: string;
  name: string | null;
  status: RecipientStatus;
}

export interface ManualDispatchResult {
  cohortSize: number;
  eligible: number;
  alreadySent: number;
  unsubscribed: number;
  sent: number;
  failed: number;
  errors: string[];
}

/**
 * Returns the full cohort for a manual-dispatch campaign, annotated with
 * each user's current status (will_send / already_sent / unsubscribed).
 * Used by the super-admin UI to preview the recipients before firing.
 */
export async function previewSingleCampaignCohort(
  key: CampaignKey
): Promise<RecipientRow[]> {
  const resolver = MANUAL_COHORTS[key];
  if (!resolver) {
    throw new Error(
      `Campaign "${key}" cannot be dispatched manually (no cohort resolver).`
    );
  }

  const cohort = await resolver();
  if (cohort.length === 0) return [];

  const userIds = cohort.map((u) => u.id);

  const alreadySentRows = await db
    .select({ userId: emailCampaignSends.userId })
    .from(emailCampaignSends)
    .where(
      and(
        eq(emailCampaignSends.campaignKey, key),
        eq(emailCampaignSends.status, "sent"),
        inArray(emailCampaignSends.userId, userIds)
      )
    );
  const alreadySentIds = new Set(alreadySentRows.map((r) => r.userId));

  const optedOutRows = await db
    .select({ id: users.id })
    .from(users)
    .where(
      and(
        inArray(users.id, userIds),
        isNotNull(users.unsubscribedFromCampaignsAt)
      )
    );
  const optedOutIds = new Set(optedOutRows.map((r) => r.id));

  return cohort.map((u) => ({
    id: u.id,
    email: u.email,
    name: u.name,
    status: alreadySentIds.has(u.id)
      ? ("already_sent" as const)
      : optedOutIds.has(u.id)
      ? ("unsubscribed" as const)
      : ("will_send" as const),
  }));
}

/**
 * Dispatches a single campaign to its manual cohort in one go.
 *
 * Guarantees:
 *  - unique(user, campaign) blocks re-sending to users already emailed.
 *  - Respects per-user campaign opt-out (unsubscribedFromCampaignsAt).
 *  - Respects the campaign's enabled flag in email_campaign_configs.
 *
 * Intentionally does NOT apply the 3-day cross-campaign throttle used by
 * the daily retention cron — incident / one-off communications need to
 * reach users promptly even if they received another email recently.
 */
export async function dispatchSingleCampaign(
  key: CampaignKey
): Promise<ManualDispatchResult> {
  const resolver = MANUAL_COHORTS[key];
  if (!resolver) {
    throw new Error(
      `Campaign "${key}" cannot be dispatched manually (no cohort resolver).`
    );
  }

  // Respect enabled flag: admin may have disabled the campaign on purpose.
  const [config] = await db
    .select({ enabled: emailCampaignConfigs.enabled, subjectOverride: emailCampaignConfigs.subjectOverride })
    .from(emailCampaignConfigs)
    .where(eq(emailCampaignConfigs.campaignKey, key))
    .limit(1);
  if (config && !config.enabled) {
    throw new Error(`Campaign "${key}" is disabled. Enable it first to dispatch.`);
  }

  const recipients = await previewSingleCampaignCohort(key);
  const alreadySentCount = recipients.filter((r) => r.status === "already_sent").length;
  const unsubscribedCount = recipients.filter((r) => r.status === "unsubscribed").length;
  const eligible = recipients.filter((r) => r.status === "will_send");

  const meta = CAMPAIGNS_REGISTRY[key];
  const subject = config?.subjectOverride?.trim() || meta.defaultSubject;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const replyMailto = `mailto:${appConfig.legal.email}`;

  const errors: string[] = [];
  let sent = 0;
  let failed = 0;

  for (const user of eligible) {
    try {
      const unsubscribeUrl = `${appUrl}/api/unsubscribe?token=${createUnsubscribeToken(user.id)}`;
      const html = await meta.render({
        userName: getFirstName(user.name),
        appUrl,
        unsubscribeUrl,
        replyMailto,
      });
      await sendMail(user.email, subject, html);
      await recordCampaignSend(user.id, key, "sent");
      sent++;
    } catch (error) {
      failed++;
      const message = error instanceof Error ? error.message : String(error);
      errors.push(`${user.email}: ${message}`);
      logger.error(`Failed to dispatch ${key} to ${user.email}`, error);
      await recordCampaignSend(user.id, key, "failed", message);
    }
  }

  return {
    cohortSize: recipients.length,
    eligible: eligible.length,
    alreadySent: alreadySentCount,
    unsubscribed: unsubscribedCount,
    sent,
    failed,
    errors,
  };
}
