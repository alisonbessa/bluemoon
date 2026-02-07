import { inngest } from "../client";
import { db } from "@/db";
import { telegramUsers } from "@/db/schema";
import { isNotNull } from "drizzle-orm";
import { sendMessage } from "@/integrations/telegram/lib/bot";
import { createLogger } from "@/shared/lib/logger";

const logger = createLogger("inngest:monthly-reminder");

/**
 * Sends a reminder to plan the next month's budget
 * Runs every Friday at 9:00 AM (UTC-3 = Brasilia time)
 * Only sends if next week is in a different month (last Friday of month)
 */
export const sendMonthlyPlanningReminder = inngest.createFunction(
  {
    id: "send-monthly-planning-reminder",
    name: "Send Monthly Planning Reminder",
  },
  { cron: "0 12 * * 5" }, // Every Friday at 12:00 UTC = 9:00 AM Brasilia
  async ({ step }) => {
    const today = new Date();
    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 7);

    // Only execute if next week is in a different month (last Friday of month)
    if (nextWeek.getMonth() === today.getMonth()) {
      return { sent: 0, message: "Not last Friday of month" };
    }

    // Get next month name in Portuguese
    const nextMonth = nextWeek.toLocaleDateString("pt-BR", { month: "long" });
    const capitalizedMonth = nextMonth.charAt(0).toUpperCase() + nextMonth.slice(1);

    // Get all connected telegram users
    const connectedUsers = await step.run("fetch-connected-users", async () => {
      return db
        .select({
          chatId: telegramUsers.chatId,
          firstName: telegramUsers.firstName,
        })
        .from(telegramUsers)
        .where(isNotNull(telegramUsers.userId));
    });

    if (connectedUsers.length === 0) {
      return { sent: 0, message: "No connected users" };
    }

    let sent = 0;
    let errors = 0;

    for (const user of connectedUsers) {
      try {
        const greeting = user.firstName ? `Olá, ${user.firstName}!` : "Olá!";

        const message = `${greeting}

📅 <b>${capitalizedMonth} está chegando!</b>

Você já planejou seu orçamento para o próximo mês?

💡 <b>Dica:</b> Revise suas despesas fixas e ajuste os valores se necessário.`;

        await step.run(`send-message-${user.chatId}`, async () => {
          await sendMessage(user.chatId, message, { parseMode: "HTML" });
        });

        sent++;
      } catch (error) {
        logger.error(`Failed to send reminder to ${user.chatId}`, error);
        errors++;
      }
    }

    return {
      sent,
      errors,
      total: connectedUsers.length,
      month: capitalizedMonth,
    };
  }
);
