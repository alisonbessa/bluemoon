import { timestamp, pgTable, text, bigint, index, jsonb } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { users } from "./user";

// Conversation steps for Telegram bot
export type TelegramConversationStep =
  | "IDLE"
  | "AWAITING_VERIFICATION_CODE"
  | "AWAITING_AMOUNT"
  | "AWAITING_DESCRIPTION"
  | "AWAITING_CATEGORY"
  | "AWAITING_CONFIRMATION";

// Context data stored during conversation
export interface TelegramConversationContext {
  pendingExpense?: {
    amount: number; // in cents
    description?: string;
    categoryId?: string;
    categoryName?: string;
  };
  verificationCode?: string;
  verificationExpiry?: string;
  lastTransactionId?: string;
}

export const telegramUsers = pgTable("telegram_users", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),

  // Telegram chat ID (can be negative for groups)
  chatId: bigint("chat_id", { mode: "number" }).unique().notNull(),

  // Telegram user ID
  telegramUserId: bigint("telegram_user_id", { mode: "number" }),

  // Telegram username (without @)
  username: text("username"),

  // Telegram first name
  firstName: text("first_name"),

  // Linked app user
  userId: text("user_id")
    .unique()
    .references(() => users.id, { onDelete: "cascade" }),

  // Conversation state
  currentStep: text("current_step")
    .$type<TelegramConversationStep>()
    .notNull()
    .default("IDLE"),

  // Context data for multi-step flows
  context: jsonb("context")
    .$type<TelegramConversationContext>()
    .default({}),

  createdAt: timestamp("created_at", { mode: "date" }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow(),
}, (table) => [
  index("idx_telegram_users_user_id").on(table.userId),
  index("idx_telegram_users_chat_id").on(table.chatId),
]);

export const telegramUsersRelations = relations(telegramUsers, ({ one }) => ({
  user: one(users, {
    fields: [telegramUsers.userId],
    references: [users.id],
  }),
}));

export type TelegramUser = typeof telegramUsers.$inferSelect;
export type NewTelegramUser = typeof telegramUsers.$inferInsert;
