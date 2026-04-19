import { db } from "@/db";
import { users } from "@/db/schema/user";
import { budgetMembers } from "@/db/schema/budget-members";
import { transactions } from "@/db/schema/transactions";
import { whatsappUsers } from "@/db/schema/whatsapp-users";
import { telegramAILogs } from "@/db/schema/telegram-ai-logs";
import { chatLogs } from "@/db/schema/chat-logs";
import {
  emailCampaignConfigs,
  emailCampaignSends,
  type CampaignKey,
} from "@/db/schema/email-campaigns";
import { and, eq, gte, inArray, isNotNull, isNull, lt, lte, sql } from "drizzle-orm";
import sendMail from "@/shared/lib/email/sendMail";
import { createLogger } from "@/shared/lib/logger";
import { appConfig } from "@/shared/lib/config";
import { createUnsubscribeToken } from "@/shared/lib/email/unsubscribe-token";
import { getFirstName } from "@/shared/lib/string-utils";
import {
  CAMPAIGN_THROTTLE_DAYS,
  recordCampaignSend,
} from "@/shared/lib/email/campaign-eligibility";
import { CAMPAIGNS_REGISTRY, CAMPAIGN_KEYS } from "@/shared/lib/email/campaigns-registry";

const logger = createLogger("retention-campaigns");

const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
const supportEmail = appConfig.legal.email;
const replyMailto = `mailto:${supportEmail}`;

type CampaignCandidate = {
  userId: string;
  email: string;
  userName: string | null;
  campaignKey: CampaignKey;
};

/**
 * Priority order when a user qualifies for multiple campaigns on the same
 * run. Higher = more important, wins. Only one campaign email per user per
 * run — throttle enforces 3 days between sends afterwards.
 */
export const CAMPAIGN_PRIORITY: Record<CampaignKey, number> = {
  winback_d21: 100,
  onboarding_stuck_d7: 90,
  onboarding_d1: 80,
  no_transaction_d3: 70,
  no_whatsapp_d7: 60,
  no_ai_d10: 50,
  power_user_feedback: 40,
};

export interface RetentionRunResult {
  considered: number;
  eligible: number;
  sentByCampaign: Record<string, number>;
  errors: number;
  /** True if at least one recipient was skipped because the campaign is disabled */
  disabledSegments: CampaignKey[];
}

/**
 * Runs the full retention campaign pipeline once. Safe to call multiple
 * times a day — the unique(user, campaign) constraint + throttle prevent
 * duplicate sends.
 *
 * Callable from both the Inngest cron wrapper and the super-admin
 * "Run now" endpoint.
 */
export async function executeRetentionCampaigns(): Promise<RetentionRunResult> {
  // Auto-seed any missing config rows so the admin UI stays accurate
  // and the cron remains configurable even if migrations didn't seed.
  await seedMissingConfigs();

  // --- Load per-campaign config
  const configs = await db
    .select({
      campaignKey: emailCampaignConfigs.campaignKey,
      enabled: emailCampaignConfigs.enabled,
      subjectOverride: emailCampaignConfigs.subjectOverride,
    })
    .from(emailCampaignConfigs);

  const configByKey = new Map<
    CampaignKey,
    { enabled: boolean; subjectOverride: string | null }
  >();
  for (const c of configs) {
    configByKey.set(c.campaignKey, {
      enabled: c.enabled,
      subjectOverride: c.subjectOverride,
    });
  }
  const isEnabled = (key: CampaignKey) => configByKey.get(key)?.enabled ?? true;
  const resolveSubject = (key: CampaignKey) =>
    configByKey.get(key)?.subjectOverride?.trim() ||
    CAMPAIGNS_REGISTRY[key].defaultSubject;

  const disabledSegments = CAMPAIGN_KEYS.filter((k) => !isEnabled(k));

  // --- Build candidate segments
  // Windows are open-ended on the older side. The unique(user, campaign)
  // constraint ensures each user receives each campaign at most once, so
  // the first run retroactively processes the whole existing base.
  const now = new Date();
  const daysAgo = (n: number) => {
    const d = new Date(now);
    d.setDate(d.getDate() - n);
    return d;
  };
  const cutoffD1 = daysAgo(1);
  const cutoffD3 = daysAgo(3);
  const cutoffD7 = daysAgo(7);
  const cutoffD10 = daysAgo(10);
  const cutoffD21 = daysAgo(21);
  const cutoffD30 = daysAgo(30);

  // onboarding_d1: created 1-7 days ago, onboarding not completed.
  // Upper bound of 7d keeps this mutually exclusive with onboarding_stuck_d7.
  const onboardingD1 = await db
    .select({ id: users.id, email: users.email, name: users.name })
    .from(users)
    .where(
      and(
        isNull(users.deletedAt),
        isNull(users.onboardingCompletedAt),
        isNotNull(users.email),
        lte(users.createdAt, cutoffD1),
        gte(users.createdAt, cutoffD7)
      )
    );

  // onboarding_stuck_d7: created 7+ days ago, still no onboarding
  const onboardingStuck = await db
    .select({ id: users.id, email: users.email, name: users.name })
    .from(users)
    .where(
      and(
        isNull(users.deletedAt),
        isNull(users.onboardingCompletedAt),
        isNotNull(users.email),
        lt(users.createdAt, cutoffD7)
      )
    );

  // no_transaction_d3+: onboarded 3+ days ago, no transaction at all
  const noTransactionCandidates = await db
    .select({ id: users.id, email: users.email, name: users.name })
    .from(users)
    .where(
      and(
        isNull(users.deletedAt),
        isNotNull(users.email),
        isNotNull(users.onboardingCompletedAt),
        lte(users.onboardingCompletedAt, cutoffD3)
      )
    );
  const noTransaction = await filterUsersWithNoTransactions(noTransactionCandidates);

  // no_whatsapp_d7+: onboarded 7+ days ago, no WhatsApp linked
  const noWhatsapp = await db
    .select({ id: users.id, email: users.email, name: users.name })
    .from(users)
    .leftJoin(whatsappUsers, eq(whatsappUsers.userId, users.id))
    .where(
      and(
        isNull(users.deletedAt),
        isNotNull(users.email),
        isNotNull(users.onboardingCompletedAt),
        lte(users.onboardingCompletedAt, cutoffD7),
        isNull(whatsappUsers.userId)
      )
    );

  // no_ai_d10+: onboarded 10+ days ago, no AI usage in the last 30 days
  const noAiCandidates = await db
    .select({ id: users.id, email: users.email, name: users.name })
    .from(users)
    .where(
      and(
        isNull(users.deletedAt),
        isNotNull(users.email),
        isNotNull(users.onboardingCompletedAt),
        lte(users.onboardingCompletedAt, cutoffD10)
      )
    );
  const noAi = await filterUsersWithoutAIUsage(noAiCandidates, cutoffD30);

  // Power users: 5+ transactions in the last 30 days
  const powerUsers = await fetchPowerUsers(cutoffD30);

  // winback_d21: onboarded 21+ days ago AND no activity in 21+ days
  const winbackCandidates = await db
    .select({ id: users.id, email: users.email, name: users.name })
    .from(users)
    .where(
      and(
        isNull(users.deletedAt),
        isNotNull(users.email),
        isNotNull(users.onboardingCompletedAt),
        lt(users.onboardingCompletedAt, cutoffD21)
      )
    );
  const winback = await filterInactiveUsers(winbackCandidates, cutoffD21);

  // --- Merge candidates, keep highest-priority campaign per user
  const pickedByUser = new Map<string, CampaignCandidate>();
  const pushCandidates = (
    list: { id: string; email: string | null; name: string | null }[],
    key: CampaignKey
  ) => {
    if (!isEnabled(key)) return;
    for (const u of list) {
      if (!u.email) continue;
      const prev = pickedByUser.get(u.id);
      if (!prev || CAMPAIGN_PRIORITY[key] > CAMPAIGN_PRIORITY[prev.campaignKey]) {
        pickedByUser.set(u.id, {
          userId: u.id,
          email: u.email,
          userName: getFirstName(u.name),
          campaignKey: key,
        });
      }
    }
  };

  pushCandidates(winback, "winback_d21");
  pushCandidates(onboardingStuck, "onboarding_stuck_d7");
  pushCandidates(onboardingD1, "onboarding_d1");
  pushCandidates(noTransaction, "no_transaction_d3");
  pushCandidates(noWhatsapp, "no_whatsapp_d7");
  pushCandidates(noAi, "no_ai_d10");
  pushCandidates(powerUsers, "power_user_feedback");

  const picked = [...pickedByUser.values()];

  // --- Apply opt-out, dedupe (per campaign) and throttle
  const eligibleUsers = await applyEligibilityFilters(picked);

  // --- Send
  const sentByCampaign: Record<string, number> = {};
  let errors = 0;

  for (const candidate of eligibleUsers) {
    try {
      const unsubscribeUrl = `${appUrl}/api/unsubscribe?token=${createUnsubscribeToken(candidate.userId)}`;
      const meta = CAMPAIGNS_REGISTRY[candidate.campaignKey];
      const subject = resolveSubject(candidate.campaignKey);
      const html = await meta.render({
        userName: candidate.userName,
        appUrl,
        unsubscribeUrl,
        replyMailto,
      });

      await sendMail(candidate.email, subject, html);
      await recordCampaignSend(candidate.userId, candidate.campaignKey, "sent");

      sentByCampaign[candidate.campaignKey] =
        (sentByCampaign[candidate.campaignKey] ?? 0) + 1;
    } catch (error) {
      errors++;
      logger.error(
        `Failed to send ${candidate.campaignKey} to user ${candidate.userId}`,
        error
      );
      await recordCampaignSend(
        candidate.userId,
        candidate.campaignKey,
        "failed",
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  return {
    considered: picked.length,
    eligible: eligibleUsers.length,
    sentByCampaign,
    errors,
    disabledSegments,
  };
}

/**
 * Creates any campaign-config rows that are missing in the DB, using
 * default metadata from the in-code registry. Idempotent (ON CONFLICT DO NOTHING).
 */
export async function seedMissingConfigs(): Promise<number> {
  const existing = await db
    .select({ campaignKey: emailCampaignConfigs.campaignKey })
    .from(emailCampaignConfigs);
  const existingKeys = new Set(existing.map((r) => r.campaignKey));

  const toInsert = CAMPAIGN_KEYS.filter((k) => !existingKeys.has(k)).map((k) => ({
    campaignKey: k,
    name: CAMPAIGNS_REGISTRY[k].name,
    description: CAMPAIGNS_REGISTRY[k].description,
  }));

  if (toInsert.length === 0) return 0;

  await db
    .insert(emailCampaignConfigs)
    .values(toInsert)
    .onConflictDoNothing({ target: emailCampaignConfigs.campaignKey });

  return toInsert.length;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function filterUsersWithNoTransactions(
  candidates: { id: string; email: string | null; name: string | null }[]
) {
  if (candidates.length === 0) return candidates;
  const userIds = candidates.map((u) => u.id);

  const rows = await db
    .selectDistinct({ userId: budgetMembers.userId })
    .from(transactions)
    .innerJoin(budgetMembers, eq(transactions.paidByMemberId, budgetMembers.id))
    .where(and(isNotNull(budgetMembers.userId), inArray(budgetMembers.userId, userIds)));

  const hasTransaction = new Set(rows.map((r) => r.userId).filter(Boolean) as string[]);
  return candidates.filter((u) => !hasTransaction.has(u.id));
}

async function filterUsersWithoutAIUsage(
  candidates: { id: string; email: string | null; name: string | null }[],
  cutoff: Date
) {
  if (candidates.length === 0) return candidates;
  const userIds = candidates.map((u) => u.id);

  const [telegramRows, chatRows] = await Promise.all([
    db
      .selectDistinct({ userId: telegramAILogs.userId })
      .from(telegramAILogs)
      .where(
        and(
          isNotNull(telegramAILogs.userId),
          inArray(telegramAILogs.userId, userIds),
          gte(telegramAILogs.createdAt, cutoff)
        )
      ),
    db
      .selectDistinct({ userId: chatLogs.userId })
      .from(chatLogs)
      .where(
        and(inArray(chatLogs.userId, userIds), gte(chatLogs.createdAt, cutoff))
      ),
  ]);

  const hasAI = new Set<string>();
  for (const r of telegramRows) if (r.userId) hasAI.add(r.userId);
  for (const r of chatRows) hasAI.add(r.userId);

  return candidates.filter((u) => !hasAI.has(u.id));
}

async function filterInactiveUsers(
  candidates: { id: string; email: string | null; name: string | null }[],
  since: Date
) {
  if (candidates.length === 0) return candidates;
  const userIds = candidates.map((u) => u.id);

  const [txRows, aiRows, chatRows] = await Promise.all([
    db
      .selectDistinct({ userId: budgetMembers.userId })
      .from(transactions)
      .innerJoin(budgetMembers, eq(transactions.paidByMemberId, budgetMembers.id))
      .where(
        and(
          isNotNull(budgetMembers.userId),
          inArray(budgetMembers.userId, userIds),
          gte(transactions.createdAt, since)
        )
      ),
    db
      .selectDistinct({ userId: telegramAILogs.userId })
      .from(telegramAILogs)
      .where(
        and(
          isNotNull(telegramAILogs.userId),
          inArray(telegramAILogs.userId, userIds),
          gte(telegramAILogs.createdAt, since)
        )
      ),
    db
      .selectDistinct({ userId: chatLogs.userId })
      .from(chatLogs)
      .where(and(inArray(chatLogs.userId, userIds), gte(chatLogs.createdAt, since))),
  ]);

  const active = new Set<string>();
  for (const r of txRows) if (r.userId) active.add(r.userId);
  for (const r of aiRows) if (r.userId) active.add(r.userId);
  for (const r of chatRows) active.add(r.userId);

  return candidates.filter((u) => !active.has(u.id));
}

async function fetchPowerUsers(cutoff: Date) {
  const rows = await db
    .select({
      userId: budgetMembers.userId,
      txCount: sql<number>`count(${transactions.id})::int`,
    })
    .from(transactions)
    .innerJoin(budgetMembers, eq(transactions.paidByMemberId, budgetMembers.id))
    .where(
      and(
        isNotNull(budgetMembers.userId),
        gte(transactions.createdAt, cutoff)
      )
    )
    .groupBy(budgetMembers.userId)
    .having(sql`count(${transactions.id}) >= 5`);

  const userIds = rows
    .map((r) => r.userId)
    .filter((id): id is string => Boolean(id));
  if (userIds.length === 0) return [];

  return db
    .select({ id: users.id, email: users.email, name: users.name })
    .from(users)
    .where(
      and(
        isNull(users.deletedAt),
        isNotNull(users.email),
        inArray(users.id, userIds)
      )
    );
}

async function applyEligibilityFilters(
  picked: CampaignCandidate[]
): Promise<CampaignCandidate[]> {
  if (picked.length === 0) return [];
  const userIds = picked.map((p) => p.userId);

  const optedOut = await db
    .select({ id: users.id })
    .from(users)
    .where(
      and(
        inArray(users.id, userIds),
        isNotNull(users.unsubscribedFromCampaignsAt)
      )
    );
  const optedOutSet = new Set(optedOut.map((u) => u.id));

  const throttleCutoff = new Date();
  throttleCutoff.setDate(throttleCutoff.getDate() - CAMPAIGN_THROTTLE_DAYS);

  const previousSends = await db
    .select({
      userId: emailCampaignSends.userId,
      campaignKey: emailCampaignSends.campaignKey,
      sentAt: emailCampaignSends.sentAt,
    })
    .from(emailCampaignSends)
    .where(
      and(
        inArray(emailCampaignSends.userId, userIds),
        eq(emailCampaignSends.status, "sent")
      )
    );

  const sentCampaignByUser = new Map<string, Set<string>>();
  const recentSendByUser = new Map<string, Date>();
  for (const s of previousSends) {
    if (!sentCampaignByUser.has(s.userId)) {
      sentCampaignByUser.set(s.userId, new Set());
    }
    sentCampaignByUser.get(s.userId)!.add(s.campaignKey);
    const prev = recentSendByUser.get(s.userId);
    if (!prev || s.sentAt > prev) {
      recentSendByUser.set(s.userId, s.sentAt);
    }
  }

  return picked.filter((p) => {
    if (optedOutSet.has(p.userId)) return false;
    if (sentCampaignByUser.get(p.userId)?.has(p.campaignKey)) return false;
    const lastSend = recentSendByUser.get(p.userId);
    if (lastSend && lastSend >= throttleCutoff) return false;
    return true;
  });
}
