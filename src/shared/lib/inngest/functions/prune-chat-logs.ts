import { inngest } from "../client";
import { db } from "@/db";
import { chatLogs } from "@/db/schema";
import { lt } from "drizzle-orm";
import { subDays } from "date-fns";

/**
 * Prunes chat_logs older than 7 days.
 * Runs daily at 4:00 AM UTC (1:00 AM Brasilia time).
 */
export const pruneChatLogs = inngest.createFunction(
  {
    id: "prune-chat-logs",
    name: "Prune Old Chat Logs",
  },
  { cron: "0 4 * * *" },
  async ({ step }) => {
    const cutoff = subDays(new Date(), 7);

    const result = await step.run("delete-old-logs", async () => {
      const deleted = await db
        .delete(chatLogs)
        .where(lt(chatLogs.createdAt, cutoff))
        .returning({ id: chatLogs.id });

      return deleted.length;
    });

    return { deleted: result };
  }
);
