import { inngest } from "../client";
import { db } from "@/db";
import {
  budgetAlertsSent,
  budgetMembers,
  categories,
  monthlyAllocations,
  telegramUsers,
  transactions,
} from "@/db/schema";
import { and, eq, gte, inArray, isNotNull, lt, sql } from "drizzle-orm";
import { sendMessage } from "@/integrations/telegram/lib/bot";
import { sendTextMessage as sendWhatsAppText } from "@/integrations/whatsapp/lib/client";
import { getOpenWindowPhoneNumber } from "@/integrations/whatsapp/lib/free-window";
import { formatCurrency } from "@/shared/lib/formatters";
import { createLogger } from "@/shared/lib/logger";

const logger = createLogger("inngest:budget-thresholds");

// Buckets checked in ascending order. A given category / month only triggers
// one alert per bucket (tracked in budget_alerts_sent) so we don't spam users.
const THRESHOLDS = [80, 100, 120] as const;

/**
 * Daily job that flags categories whose spending crossed a planned-budget
 * threshold (80%, 100%, 120%) for the current month and notifies the affected
 * member via connected messaging channels.
 *
 * WhatsApp: only sent if the 24h Customer Service Window is still open
 * (i.e. the user messaged us within the last 24h). Outside it, Meta requires
 * a billable template, which we intentionally avoid.
 *
 * Telegram: sent freely (Telegram has no such restriction).
 */
export const checkBudgetThresholds = inngest.createFunction(
  {
    id: "check-budget-thresholds",
    name: "Check Budget Thresholds",
  },
  { cron: "0 13 * * *" }, // Daily 13:00 UTC ≈ 10:00 AM Brasília
  async ({ step }) => {
    const now = new Date();
    const year = now.getUTCFullYear();
    const month = now.getUTCMonth() + 1;

    const monthStart = new Date(Date.UTC(year, month - 1, 1));
    const nextMonthStart = new Date(Date.UTC(year, month, 1));

    // Per-category spending for the current month (expenses only).
    const spendRows = await step.run("aggregate-spending", async () => {
      return db
        .select({
          categoryId: transactions.categoryId,
          spent: sql<number>`COALESCE(SUM(${transactions.amount}), 0)::bigint`,
        })
        .from(transactions)
        .where(
          and(
            eq(transactions.type, "expense"),
            isNotNull(transactions.categoryId),
            gte(transactions.date, monthStart),
            lt(transactions.date, nextMonthStart),
          ),
        )
        .groupBy(transactions.categoryId);
    });

    if (spendRows.length === 0) {
      return { processed: 0, sent: 0, reason: "no-spending" };
    }

    const spendByCategory = new Map<string, number>();
    for (const row of spendRows) {
      if (row.categoryId) spendByCategory.set(row.categoryId, Number(row.spent));
    }

    const categoryIds = Array.from(spendByCategory.keys());

    // Planned amounts for the month. Prefer monthly_allocations override,
    // otherwise fall back to category.plannedAmount.
    const categoryRows = await step.run("fetch-categories", async () => {
      return db
        .select({
          id: categories.id,
          name: categories.name,
          budgetId: categories.budgetId,
          memberId: categories.memberId,
          behavior: categories.behavior,
          plannedAmount: categories.plannedAmount,
          isArchived: categories.isArchived,
        })
        .from(categories)
        .where(inArray(categories.id, categoryIds));
    });

    const allocationRows = await step.run("fetch-allocations", async () => {
      return db
        .select({
          categoryId: monthlyAllocations.categoryId,
          allocated: monthlyAllocations.allocated,
        })
        .from(monthlyAllocations)
        .where(
          and(
            eq(monthlyAllocations.year, year),
            eq(monthlyAllocations.month, month),
            inArray(monthlyAllocations.categoryId, categoryIds),
          ),
        );
    });
    const allocationByCategory = new Map<string, number>();
    for (const row of allocationRows) {
      allocationByCategory.set(row.categoryId, Number(row.allocated));
    }

    // Existing alert rows for this month to enforce idempotency.
    const alertedRows = await step.run("fetch-alerted", async () => {
      return db
        .select({
          categoryId: budgetAlertsSent.categoryId,
          thresholdPct: budgetAlertsSent.thresholdPct,
        })
        .from(budgetAlertsSent)
        .where(
          and(
            eq(budgetAlertsSent.year, year),
            eq(budgetAlertsSent.month, month),
            inArray(budgetAlertsSent.categoryId, categoryIds),
          ),
        );
    });
    const alertedSet = new Set(
      alertedRows.map((r) => `${r.categoryId}:${r.thresholdPct}`),
    );

    let processed = 0;
    let sent = 0;

    for (const cat of categoryRows) {
      if (cat.isArchived) continue;

      const planned =
        allocationByCategory.get(cat.id) ?? Number(cat.plannedAmount ?? 0);
      if (!planned || planned <= 0) continue;

      const spent = spendByCategory.get(cat.id) ?? 0;
      processed++;

      // Highest bucket crossed that hasn't been notified yet.
      const bucketsToFire = THRESHOLDS.filter((pct) => {
        const isCrossed = spent >= Math.floor((planned * pct) / 100);
        if (!isCrossed) return false;
        return !alertedSet.has(`${cat.id}:${pct}`);
      });

      if (bucketsToFire.length === 0) continue;
      // Only notify once per run — the largest bucket crossed is the most
      // informative message. The remaining buckets get a row below so they
      // don't trigger again later.
      const fired = bucketsToFire[bucketsToFire.length - 1];

      // Resolve the recipient: the scope member of the category (personal) or
      // both owner/partner (shared). For shared categories we pick the owner.
      const recipients = await step.run(`recipients-${cat.id}`, async () => {
        if (cat.memberId) {
          return db
            .select({ userId: budgetMembers.userId, name: budgetMembers.name })
            .from(budgetMembers)
            .where(eq(budgetMembers.id, cat.memberId!));
        }
        return db
          .select({ userId: budgetMembers.userId, name: budgetMembers.name })
          .from(budgetMembers)
          .where(
            and(
              eq(budgetMembers.budgetId, cat.budgetId),
              inArray(budgetMembers.type, ["owner", "partner"]),
            ),
          );
      });

      const recipientUserIds = recipients
        .map((r) => r.userId)
        .filter((v): v is string => Boolean(v));

      if (recipientUserIds.length === 0) {
        // No user to notify, but record the bucket(s) so we don't re-evaluate.
        for (const pct of bucketsToFire) {
          await step.run(`skip-noop-${cat.id}-${pct}`, async () => {
            await db
              .insert(budgetAlertsSent)
              .values({
                budgetId: cat.budgetId,
                categoryId: cat.id,
                year,
                month,
                thresholdPct: pct,
                spentCents: spent,
                plannedCents: planned,
              })
              .onConflictDoNothing();
          });
        }
        continue;
      }

      const message = buildMessage({
        categoryName: cat.name,
        thresholdPct: fired,
        spent,
        planned,
      });

      for (const userId of recipientUserIds) {
        // Telegram — always free to send.
        await step.run(`telegram-${cat.id}-${userId}`, async () => {
          const [tg] = await db
            .select({ chatId: telegramUsers.chatId })
            .from(telegramUsers)
            .where(eq(telegramUsers.userId, userId))
            .limit(1);
          if (!tg?.chatId) return;
          try {
            await sendMessage(tg.chatId, message, { parseMode: "HTML" });
            sent++;
          } catch (err) {
            logger.error("telegram send failed", err);
          }
        });

        // WhatsApp — ONLY if the 24h Customer Service Window is still open.
        // Outside it, Meta charges for template messages; we skip on purpose.
        await step.run(`whatsapp-${cat.id}-${userId}`, async () => {
          const phoneNumber = await getOpenWindowPhoneNumber(userId);
          if (!phoneNumber) return;
          try {
            await sendWhatsAppText(phoneNumber, stripHtml(message));
            sent++;
          } catch (err) {
            logger.error("whatsapp send failed", err);
          }
        });
      }

      // Record every bucket that was crossed, including ones we decided not
      // to fire a message for, so future runs don't re-attempt them.
      for (const pct of bucketsToFire) {
        await step.run(`record-${cat.id}-${pct}`, async () => {
          await db
            .insert(budgetAlertsSent)
            .values({
              budgetId: cat.budgetId,
              categoryId: cat.id,
              year,
              month,
              thresholdPct: pct,
              spentCents: spent,
              plannedCents: planned,
            })
            .onConflictDoNothing();
        });
      }
    }

    return { processed, sent };
  },
);

function buildMessage(input: {
  categoryName: string;
  thresholdPct: number;
  spent: number;
  planned: number;
}): string {
  const { categoryName, thresholdPct, spent, planned } = input;
  const icon = thresholdPct >= 100 ? "🚨" : "⚠️";
  const headline =
    thresholdPct >= 120
      ? `${icon} <b>Estourou o orçamento</b> — ${categoryName}`
      : thresholdPct >= 100
        ? `${icon} <b>Orçamento atingido</b> — ${categoryName}`
        : `${icon} <b>Atenção no orçamento</b> — ${categoryName}`;

  return `${headline}

Você já gastou ${formatCurrency(spent)} de ${formatCurrency(planned)} planejado (${thresholdPct}% ou mais).`;
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, "");
}
