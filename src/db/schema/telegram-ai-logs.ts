import { timestamp, pgTable, text, integer, jsonb, boolean, index } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { users } from "./user";
import { budgets } from "./budgets";

// Types for stored AI response data
export interface StoredAIResponse {
  intent: string;
  confidence: number;
  data: Record<string, unknown> | null;
  requiresConfirmation: boolean;
  suggestedResponse?: string;
}

export interface StoredUserContext {
  categoriesCount: number;
  incomeSourcesCount: number;
  goalsCount: number;
  accountsCount: number;
  hasDefaultAccount: boolean;
}

// Resolution types
export type AILogResolution =
  | "pending"           // Not yet resolved
  | "confirmed"         // User confirmed the AI interpretation
  | "corrected"         // User corrected (selected different category, etc.)
  | "cancelled"         // User cancelled the operation
  | "fallback"          // System used fallback (manual input)
  | "unknown_ignored";  // UNKNOWN intent, no action taken

export const telegramAILogs = pgTable("telegram_ai_logs", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),

  // User who sent the message
  userId: text("user_id")
    .references(() => users.id, { onDelete: "cascade" }),

  // Budget context
  budgetId: text("budget_id")
    .references(() => budgets.id, { onDelete: "cascade" }),

  // Original message from user
  originalMessage: text("original_message").notNull(),

  // AI response
  aiResponse: jsonb("ai_response")
    .$type<StoredAIResponse>()
    .notNull(),

  // Simplified user context (for analysis)
  userContext: jsonb("user_context")
    .$type<StoredUserContext>(),

  // How the message was resolved
  resolution: text("resolution")
    .$type<AILogResolution>()
    .notNull()
    .default("pending"),

  // What the user actually selected/corrected to (if applicable)
  correctedIntent: text("corrected_intent"),
  correctedCategoryId: text("corrected_category_id"),
  correctedAmount: integer("corrected_amount"),

  // Was this a low confidence response?
  isLowConfidence: boolean("is_low_confidence").notNull().default(false),

  // Was the intent UNKNOWN?
  isUnknownIntent: boolean("is_unknown_intent").notNull().default(false),

  // Bot's response message sent back to user
  botResponse: text("bot_response"),

  // Error message if any
  errorMessage: text("error_message"),

  // Timestamps
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow(),
  resolvedAt: timestamp("resolved_at", { mode: "date" }),
}, (table) => [
  index("idx_telegram_ai_logs_user_id").on(table.userId),
  index("idx_telegram_ai_logs_budget_id").on(table.budgetId),
  index("idx_telegram_ai_logs_is_low_confidence").on(table.isLowConfidence),
  index("idx_telegram_ai_logs_is_unknown_intent").on(table.isUnknownIntent),
  index("idx_telegram_ai_logs_resolution").on(table.resolution),
  index("idx_telegram_ai_logs_created_at").on(table.createdAt),
]);

export const telegramAILogsRelations = relations(telegramAILogs, ({ one }) => ({
  user: one(users, {
    fields: [telegramAILogs.userId],
    references: [users.id],
  }),
  budget: one(budgets, {
    fields: [telegramAILogs.budgetId],
    references: [budgets.id],
  }),
}));

export type TelegramAILog = typeof telegramAILogs.$inferSelect;
export type NewTelegramAILog = typeof telegramAILogs.$inferInsert;
