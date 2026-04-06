import { timestamp, pgTable, text, index } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { users } from "./user";

/**
 * Stores web AI chat messages for analytics.
 * Rows older than 7 days should be pruned via scheduled job.
 */
export const chatLogs = pgTable("chat_logs", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),

  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),

  // Groups messages into conversations
  sessionId: text("session_id").notNull(),

  // "user" or "assistant"
  role: text("role").$type<"user" | "assistant">().notNull(),

  content: text("content").notNull(),

  createdAt: timestamp("created_at", { mode: "date" }).defaultNow(),
}, (table) => [
  index("idx_chat_logs_user_id").on(table.userId),
  index("idx_chat_logs_session_id").on(table.sessionId),
  index("idx_chat_logs_created_at").on(table.createdAt),
]);

export const chatLogsRelations = relations(chatLogs, ({ one }) => ({
  user: one(users, {
    fields: [chatLogs.userId],
    references: [users.id],
  }),
}));

export type ChatLog = typeof chatLogs.$inferSelect;
export type NewChatLog = typeof chatLogs.$inferInsert;
