import { inngest } from "../client";
import { db } from "@/db";
import { telegramUsers, transactions, recurringBills, budgetMembers } from "@/db/schema";
import { eq, and, gte, lte, isNotNull, inArray } from "drizzle-orm";
import { sendMessage } from "@/integrations/telegram/lib/bot";
import { formatCurrency, parseLocalDate } from "@/shared/lib/formatters";
import { createLogger } from "@/shared/lib/logger";

const logger = createLogger("inngest:weekly-bills");

/**
 * Sends weekly bills summary to connected Telegram users
 * Runs every Sunday at 9:00 AM (UTC-3 = Brasilia time)
 *
 * For each connected user:
 * 1. Get their pending transactions for the next 7 days
 * 2. Format and send a summary message
 */
export const sendWeeklyBillsSummary = inngest.createFunction(
  {
    id: "send-weekly-bills-summary",
    name: "Send Weekly Bills Summary",
  },
  { cron: "0 12 * * 0" }, // Sunday at 12:00 UTC = 9:00 AM Brasilia
  async ({ step }) => {
    // Get all connected telegram users
    const connectedUsers = await step.run("fetch-connected-users", async () => {
      return db
        .select({
          chatId: telegramUsers.chatId,
          userId: telegramUsers.userId,
          firstName: telegramUsers.firstName,
        })
        .from(telegramUsers)
        .where(isNotNull(telegramUsers.userId));
    });

    if (connectedUsers.length === 0) {
      return { sent: 0, message: "No connected users" };
    }

    const today = new Date();
    const nextWeek = new Date();
    nextWeek.setDate(today.getDate() + 7);
    nextWeek.setHours(23, 59, 59, 999);

    let sent = 0;
    let errors = 0;

    for (const user of connectedUsers) {
      if (!user.userId) continue;

      try {
        // Get user's budget membership
        const [membership] = await step.run(`get-membership-${user.chatId}`, async () => {
          return db
            .select({ budgetId: budgetMembers.budgetId })
            .from(budgetMembers)
            .where(eq(budgetMembers.userId, user.userId!))
            .limit(1);
        });

        if (!membership) continue;

        // Get pending transactions for the next 7 days
        const upcomingTransactions = await step.run(`get-upcoming-${user.chatId}`, async () => {
          return db
            .select({
              id: transactions.id,
              description: transactions.description,
              amount: transactions.amount,
              date: transactions.date,
              recurringBillId: transactions.recurringBillId,
            })
            .from(transactions)
            .where(
              and(
                eq(transactions.budgetId, membership.budgetId),
                eq(transactions.type, "expense"),
                eq(transactions.status, "pending"),
                gte(transactions.date, today),
                lte(transactions.date, nextWeek)
              )
            )
            .orderBy(transactions.date);
        });

        if (upcomingTransactions.length === 0) continue;

        // Get recurring bill info for auto-debit badge
        const billIds = upcomingTransactions
          .filter((t) => t.recurringBillId)
          .map((t) => t.recurringBillId!);

        const billsInfo = billIds.length > 0
          ? await step.run(`get-bills-info-${user.chatId}`, async () => {
              return db
                .select({
                  id: recurringBills.id,
                  isAutoDebit: recurringBills.isAutoDebit,
                })
                .from(recurringBills)
                .where(inArray(recurringBills.id, billIds));
            })
          : [];

        const autoDebitIds = new Set(
          billsInfo.filter((b) => b.isAutoDebit).map((b) => b.id)
        );

        // Format message
        const greeting = user.firstName ? `Olá, ${user.firstName}!` : "Olá!";
        const dayNames = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

        let totalAmount = 0;
        const lines = upcomingTransactions.map((t) => {
          totalAmount += t.amount;
          const date = parseLocalDate(t.date);
          const dayName = dayNames[date.getDay()];
          const dayNum = date.getDate().toString().padStart(2, "0");
          const isAutoDebit = t.recurringBillId && autoDebitIds.has(t.recurringBillId);
          const badge = isAutoDebit ? " 🔄" : " ⏳";

          return `${dayName} ${dayNum}: ${t.description} - ${formatCurrency(t.amount)}${badge}`;
        });

        const message = `${greeting}

📅 <b>Contas da Semana</b>

${lines.join("\n")}

<b>Total: ${formatCurrency(totalAmount)}</b>

⏳ = Aguardando confirmação
🔄 = Débito automático`;

        // Send message
        await step.run(`send-message-${user.chatId}`, async () => {
          await sendMessage(user.chatId, message, { parseMode: "HTML" });
        });

        sent++;
      } catch (error) {
        logger.error(`Failed to send summary to ${user.chatId}`, error);
        errors++;
      }
    }

    return {
      sent,
      errors,
      total: connectedUsers.length,
    };
  }
);
