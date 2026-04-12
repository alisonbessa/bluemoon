import { inngest } from "../client";
import { db } from "@/db";
import { users } from "@/db/schema/user";
import { budgetMembers } from "@/db/schema/budget-members";
import { transactions } from "@/db/schema/transactions";
import { whatsappUsers } from "@/db/schema/whatsapp-users";
import { telegramAILogs } from "@/db/schema/telegram-ai-logs";
import { chatLogs } from "@/db/schema/chat-logs";
import {
  emailCampaignSends,
  type CampaignKey,
} from "@/db/schema/email-campaigns";
import { and, eq, gte, inArray, isNotNull, isNull, lt, lte, sql } from "drizzle-orm";
import { render } from "@react-email/render";
import sendMail from "@/shared/lib/email/sendMail";
import { createLogger } from "@/shared/lib/logger";
import { appConfig } from "@/shared/lib/config";
import { createUnsubscribeToken } from "@/shared/lib/email/unsubscribe-token";
import {
  CAMPAIGN_THROTTLE_DAYS,
  recordCampaignSend,
} from "@/shared/lib/email/campaign-eligibility";

import OnboardingReminderD1 from "@/emails/OnboardingReminderD1";
import OnboardingStuckD7 from "@/emails/OnboardingStuckD7";
import NoTransactionD3 from "@/emails/NoTransactionD3";
import WhatsAppInviteD7 from "@/emails/WhatsAppInviteD7";
import AIAssistantDemoD10 from "@/emails/AIAssistantDemoD10";
import PowerUserFeedback from "@/emails/PowerUserFeedback";
import WinBackD21 from "@/emails/WinBackD21";

const logger = createLogger("inngest:retention-campaigns");

const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
const supportEmail = appConfig.legal.email;
const replyMailto = `mailto:${supportEmail}`;

type CampaignCandidate = {
  userId: string;
  email: string;
  userName: string;
  campaignKey: CampaignKey;
};

/**
 * Priority order when a user qualifies for multiple campaigns on the same
 * day. Higher = more important, wins. Only one campaign email per user per
 * run — the throttle helper enforces 3 days between sends afterwards.
 */
const CAMPAIGN_PRIORITY: Record<CampaignKey, number> = {
  winback_d21: 100,
  onboarding_stuck_d7: 90,
  onboarding_d1: 80,
  no_transaction_d3: 70,
  no_whatsapp_d7: 60,
  no_ai_d10: 50,
  power_user_feedback: 40,
};

function dayWindow(daysAgo: number): { start: Date; end: Date } {
  const start = new Date();
  start.setDate(start.getDate() - daysAgo);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

/**
 * Runs every day at 13:00 UTC (10:00 Brasilia).
 * Scans users for 7 different retention/engagement segments and sends at
 * most one email per user, respecting:
 *   - per-user unsubscribe flag
 *   - "already sent this campaign before" (unique constraint)
 *   - global throttle: no more than 1 campaign email per 3 days per user
 *   - priority ordering when a user qualifies for multiple segments
 */
export const runRetentionCampaigns = inngest.createFunction(
  { id: "run-retention-campaigns", name: "Run Retention Campaigns" },
  { cron: "0 13 * * *" },
  async ({ step }) => {
    // ------------------------------------------------------------------
    // 1. Build candidate lists for each segment
    // ------------------------------------------------------------------
    const onboardingD1Window = dayWindow(1);
    const onboardingD7Window = dayWindow(7);
    const noTransactionSince = dayWindow(3);
    const noWhatsappWindow = dayWindow(7);
    const noAiWindow = dayWindow(10);
    const winbackWindow = dayWindow(21);

    // --- Onboarding D+1: signed up ~1 day ago, onboarding not completed
    const onboardingD1 = await step.run("seg-onboarding-d1", async () =>
      db
        .select({ id: users.id, email: users.email, name: users.name })
        .from(users)
        .where(
          and(
            isNull(users.deletedAt),
            isNull(users.onboardingCompletedAt),
            isNotNull(users.email),
            gte(users.createdAt, onboardingD1Window.start),
            lte(users.createdAt, onboardingD1Window.end)
          )
        )
    );

    // --- Onboarding stuck D+7: signed up ~7 days ago, still no onboarding
    const onboardingStuck = await step.run("seg-onboarding-stuck", async () =>
      db
        .select({ id: users.id, email: users.email, name: users.name })
        .from(users)
        .where(
          and(
            isNull(users.deletedAt),
            isNull(users.onboardingCompletedAt),
            isNotNull(users.email),
            gte(users.createdAt, onboardingD7Window.start),
            lte(users.createdAt, onboardingD7Window.end)
          )
        )
    );

    // --- No transaction D+3: onboarded ~3 days ago, no transaction at all
    const noTransactionCandidates = await step.run("seg-no-transaction", async () =>
      db
        .select({ id: users.id, email: users.email, name: users.name })
        .from(users)
        .where(
          and(
            isNull(users.deletedAt),
            isNotNull(users.email),
            isNotNull(users.onboardingCompletedAt),
            gte(users.onboardingCompletedAt, noTransactionSince.start),
            lte(users.onboardingCompletedAt, noTransactionSince.end)
          )
        )
    );
    const noTransaction = await filterUsersWithNoTransactions(
      noTransactionCandidates
    );

    // --- No WhatsApp D+7: onboarded ~7 days ago, no WhatsApp linked
    const noWhatsappCandidates = await step.run("seg-no-whatsapp", async () =>
      db
        .select({ id: users.id, email: users.email, name: users.name })
        .from(users)
        .leftJoin(whatsappUsers, eq(whatsappUsers.userId, users.id))
        .where(
          and(
            isNull(users.deletedAt),
            isNotNull(users.email),
            isNotNull(users.onboardingCompletedAt),
            gte(users.onboardingCompletedAt, noWhatsappWindow.start),
            lte(users.onboardingCompletedAt, noWhatsappWindow.end),
            isNull(whatsappUsers.userId)
          )
        )
    );

    // --- No AI D+10: onboarded ~10 days ago, no AI usage in the last 30 days
    const aiUsageCutoff = new Date();
    aiUsageCutoff.setDate(aiUsageCutoff.getDate() - 30);
    const noAiCandidates = await step.run("seg-no-ai", async () =>
      db
        .select({ id: users.id, email: users.email, name: users.name })
        .from(users)
        .where(
          and(
            isNull(users.deletedAt),
            isNotNull(users.email),
            isNotNull(users.onboardingCompletedAt),
            gte(users.onboardingCompletedAt, noAiWindow.start),
            lte(users.onboardingCompletedAt, noAiWindow.end)
          )
        )
    );
    const noAi = await filterUsersWithoutAIUsage(noAiCandidates, aiUsageCutoff);

    // --- Power users: 5+ transactions in the last 30 days
    const activityCutoff = new Date();
    activityCutoff.setDate(activityCutoff.getDate() - 30);
    const powerUsers = await step.run("seg-power-users", async () => {
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
            gte(transactions.createdAt, activityCutoff)
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
    });

    // --- Win-back D+21: no activity in any channel for 21+ days
    const winbackCandidates = await step.run("seg-winback", async () =>
      db
        .select({ id: users.id, email: users.email, name: users.name })
        .from(users)
        .where(
          and(
            isNull(users.deletedAt),
            isNotNull(users.email),
            isNotNull(users.onboardingCompletedAt),
            lt(users.onboardingCompletedAt, winbackWindow.start)
          )
        )
    );
    const winback = await filterInactiveUsers(
      winbackCandidates,
      winbackWindow.start
    );

    // ------------------------------------------------------------------
    // 2. Merge candidates, keep highest-priority campaign per user
    // ------------------------------------------------------------------
    const pickedByUser = new Map<string, CampaignCandidate>();
    const pushCandidates = (list: typeof onboardingD1, key: CampaignKey) => {
      for (const u of list) {
        if (!u.email) continue;
        const prev = pickedByUser.get(u.id);
        if (!prev || CAMPAIGN_PRIORITY[key] > CAMPAIGN_PRIORITY[prev.campaignKey]) {
          pickedByUser.set(u.id, {
            userId: u.id,
            email: u.email,
            userName: u.name || "Usuário",
            campaignKey: key,
          });
        }
      }
    };

    pushCandidates(winback, "winback_d21");
    pushCandidates(onboardingStuck, "onboarding_stuck_d7");
    pushCandidates(onboardingD1, "onboarding_d1");
    pushCandidates(noTransaction, "no_transaction_d3");
    pushCandidates(noWhatsappCandidates, "no_whatsapp_d7");
    pushCandidates(noAi, "no_ai_d10");
    pushCandidates(powerUsers, "power_user_feedback");

    const picked = [...pickedByUser.values()];

    // ------------------------------------------------------------------
    // 3. Apply "unsubscribed" + "already sent this campaign" + throttle
    // ------------------------------------------------------------------
    const eligibleUsers = await step.run("filter-opt-out-and-sent", async () => {
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
    });

    // ------------------------------------------------------------------
    // 4. Send emails
    // ------------------------------------------------------------------
    const sentByCampaign: Record<string, number> = {};
    let errors = 0;

    for (const candidate of eligibleUsers) {
      try {
        const unsubscribeUrl = `${appUrl}/api/unsubscribe?token=${createUnsubscribeToken(candidate.userId)}`;
        const { subject, html } = await renderCampaignEmail(candidate, unsubscribeUrl);

        await step.run(`send-${candidate.campaignKey}-${candidate.userId}`, async () => {
          await sendMail(candidate.email, subject, html);
        });

        await step.run(`record-${candidate.campaignKey}-${candidate.userId}`, async () => {
          await recordCampaignSend(candidate.userId, candidate.campaignKey, "sent");
        });

        sentByCampaign[candidate.campaignKey] =
          (sentByCampaign[candidate.campaignKey] ?? 0) + 1;
      } catch (error) {
        errors++;
        logger.error(
          `Failed to send ${candidate.campaignKey} to user ${candidate.userId}`,
          error
        );
        await step.run(`record-fail-${candidate.campaignKey}-${candidate.userId}`, async () => {
          await recordCampaignSend(
            candidate.userId,
            candidate.campaignKey,
            "failed",
            error instanceof Error ? error.message : String(error)
          );
        });
      }
    }

    return {
      considered: picked.length,
      eligible: eligibleUsers.length,
      sentByCampaign,
      errors,
    };
  }
);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function filterUsersWithNoTransactions(
  candidates: { id: string; email: string; name: string | null }[]
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
  candidates: { id: string; email: string; name: string | null }[],
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
  candidates: { id: string; email: string; name: string | null }[],
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

async function renderCampaignEmail(
  candidate: CampaignCandidate,
  unsubscribeUrl: string
): Promise<{ subject: string; html: string }> {
  switch (candidate.campaignKey) {
    case "onboarding_d1":
      return {
        subject: `Falta pouco pra começar no ${appConfig.projectName}`,
        html: await render(
          OnboardingReminderD1({
            userName: candidate.userName,
            setupUrl: `${appUrl}/app/setup`,
            unsubscribeUrl,
          })
        ),
      };
    case "onboarding_stuck_d7":
      return {
        subject: `O que te fez parar, ${candidate.userName}?`,
        html: await render(
          OnboardingStuckD7({
            userName: candidate.userName,
            replyMailto,
            unsubscribeUrl,
          })
        ),
      };
    case "no_transaction_d3":
      return {
        subject: "Registre seu primeiro gasto em 10 segundos",
        html: await render(
          NoTransactionD3({
            userName: candidate.userName,
            appUrl,
            unsubscribeUrl,
          })
        ),
      };
    case "no_whatsapp_d7":
      return {
        subject: `Registre gastos pelo WhatsApp, ${candidate.userName}`,
        html: await render(
          WhatsAppInviteD7({
            userName: candidate.userName,
            connectUrl: `${appUrl}/app/settings`,
            unsubscribeUrl,
          })
        ),
      };
    case "no_ai_d10":
      return {
        subject: `Já testou o assistente de IA, ${candidate.userName}?`,
        html: await render(
          AIAssistantDemoD10({
            userName: candidate.userName,
            appUrl,
            unsubscribeUrl,
          })
        ),
      };
    case "power_user_feedback":
      return {
        subject: "3 minutos do seu tempo? (Alison / HiveBudget)",
        html: await render(
          PowerUserFeedback({
            userName: candidate.userName,
            surveyUrl: `${appUrl}/app/survey/power-user-v1`,
            unsubscribeUrl,
          })
        ),
      };
    case "winback_d21":
      return {
        subject: `O que faltou, ${candidate.userName}?`,
        html: await render(
          WinBackD21({
            userName: candidate.userName,
            replyMailto,
            unsubscribeUrl,
          })
        ),
      };
  }
}
