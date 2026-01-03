import { timestamp, pgTable, text, index } from "drizzle-orm/pg-core";
import { users } from "./user";

// Pending Telegram connection codes
export const telegramPendingConnections = pgTable("telegram_pending_connections", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),

  // The verification code (e.g., "ABC123")
  code: text("code").notNull().unique(),

  // The user who requested the connection
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),

  // When the code expires
  expiresAt: timestamp("expires_at", { mode: "date" }).notNull(),

  createdAt: timestamp("created_at", { mode: "date" }).defaultNow(),
}, (table) => [
  index("idx_telegram_pending_code").on(table.code),
  index("idx_telegram_pending_user").on(table.userId),
]);

export type TelegramPendingConnection = typeof telegramPendingConnections.$inferSelect;
export type NewTelegramPendingConnection = typeof telegramPendingConnections.$inferInsert;
