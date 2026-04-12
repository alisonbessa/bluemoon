import { db } from "@/db";
import { emailCampaignSends, type CampaignKey } from "@/db/schema/email-campaigns";
import { users } from "@/db/schema/user";
import { and, desc, eq, gte } from "drizzle-orm";

/**
 * Minimum window (in days) between any two retention emails sent to the
 * same user. Prevents us from spamming a user that qualifies for multiple
 * segments at the same time.
 */
export const CAMPAIGN_THROTTLE_DAYS = 3;

export type EligibilityResult =
  | { eligible: true }
  | { eligible: false; reason: "unsubscribed" | "already_sent" | "throttled" | "user_not_found" | "email_missing" };

/**
 * Checks whether we are allowed to send a given campaign email to a user.
 *
 * Rules:
 *  1. User must exist, have an email, and not be soft-deleted.
 *  2. User must not have opted out of campaigns.
 *  3. The same (user, campaignKey) pair must not have been sent before
 *     (unique constraint also enforces this at DB level).
 *  4. The user must not have received ANY retention email in the last
 *     CAMPAIGN_THROTTLE_DAYS days.
 */
export async function checkCampaignEligibility(
  userId: string,
  campaignKey: CampaignKey
): Promise<EligibilityResult> {
  const [user] = await db
    .select({
      id: users.id,
      email: users.email,
      deletedAt: users.deletedAt,
      unsubscribedAt: users.unsubscribedFromCampaignsAt,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user || user.deletedAt) return { eligible: false, reason: "user_not_found" };
  if (!user.email) return { eligible: false, reason: "email_missing" };
  if (user.unsubscribedAt) return { eligible: false, reason: "unsubscribed" };

  const [alreadySent] = await db
    .select({ id: emailCampaignSends.id })
    .from(emailCampaignSends)
    .where(
      and(
        eq(emailCampaignSends.userId, userId),
        eq(emailCampaignSends.campaignKey, campaignKey),
        eq(emailCampaignSends.status, "sent")
      )
    )
    .limit(1);

  if (alreadySent) return { eligible: false, reason: "already_sent" };

  const throttleCutoff = new Date();
  throttleCutoff.setDate(throttleCutoff.getDate() - CAMPAIGN_THROTTLE_DAYS);

  const [recentSend] = await db
    .select({ id: emailCampaignSends.id })
    .from(emailCampaignSends)
    .where(
      and(
        eq(emailCampaignSends.userId, userId),
        eq(emailCampaignSends.status, "sent"),
        gte(emailCampaignSends.sentAt, throttleCutoff)
      )
    )
    .orderBy(desc(emailCampaignSends.sentAt))
    .limit(1);

  if (recentSend) return { eligible: false, reason: "throttled" };

  return { eligible: true };
}

/**
 * Records a successful campaign send. Swallows unique-constraint errors
 * so a re-run of the cron within the same day doesn't crash.
 */
export async function recordCampaignSend(
  userId: string,
  campaignKey: CampaignKey,
  status: "sent" | "failed" = "sent",
  errorMessage?: string
) {
  try {
    await db
      .insert(emailCampaignSends)
      .values({ userId, campaignKey, status, errorMessage: errorMessage ?? null })
      .onConflictDoNothing({
        target: [emailCampaignSends.userId, emailCampaignSends.campaignKey],
      });
  } catch {
    // Best-effort tracking — don't throw on insert races.
  }
}
