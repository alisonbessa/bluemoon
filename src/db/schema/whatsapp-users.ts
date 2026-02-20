import { timestamp, pgTable, text, index, jsonb } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { users } from "./user";
import type { ConversationStep, ConversationContext } from "@/integrations/messaging/lib/types";

export const whatsappUsers = pgTable("whatsapp_users", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),

  // WhatsApp phone number (e.g., "5511999998888")
  phoneNumber: text("phone_number").unique().notNull(),

  // WhatsApp display name
  displayName: text("display_name"),

  // Linked app user
  userId: text("user_id")
    .unique()
    .references(() => users.id, { onDelete: "cascade" }),

  // Conversation state (shared types with Telegram)
  currentStep: text("current_step")
    .$type<ConversationStep>()
    .notNull()
    .default("IDLE"),

  // Context data for multi-step flows
  context: jsonb("context")
    .$type<ConversationContext>()
    .default({}),

  createdAt: timestamp("created_at", { mode: "date" }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow(),
}, (table) => [
  index("idx_whatsapp_users_user_id").on(table.userId),
  index("idx_whatsapp_users_phone").on(table.phoneNumber),
]);

export const whatsappUsersRelations = relations(whatsappUsers, ({ one }) => ({
  user: one(users, {
    fields: [whatsappUsers.userId],
    references: [users.id],
  }),
}));

export type WhatsAppUser = typeof whatsappUsers.$inferSelect;
export type NewWhatsAppUser = typeof whatsappUsers.$inferInsert;
