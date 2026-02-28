import { timestamp, pgTable, text } from "drizzle-orm/pg-core";
import { users } from "./user";
import { relations } from "drizzle-orm";
import { z } from "zod";

export const privacyModeEnum = z.enum(["visible", "unified", "private"]);
export type PrivacyMode = z.infer<typeof privacyModeEnum>;

export const budgets = pgTable("budgets", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  description: text("description"),
  currency: text("currency").notNull().default("BRL"),

  // Privacidade dos gastos pessoais entre membros (Duo)
  privacyMode: text("privacy_mode").$type<PrivacyMode>().default("visible"),
  pendingPrivacyMode: text("pending_privacy_mode").$type<PrivacyMode>(),
  privacyChangeRequestedBy: text("privacy_change_requested_by"),

  createdAt: timestamp("created_at", { mode: "date" }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow(),
});

export const budgetsRelations = relations(budgets, ({ many }) => ({
  members: many(budgetMembers),
  categories: many(categories),
  financialAccounts: many(financialAccounts),
  transactions: many(transactions),
  invites: many(invites),
}));

// Forward declarations - these will be properly imported from their own files
import { budgetMembers } from "./budget-members";
import { categories } from "./categories";
import { financialAccounts } from "./accounts";
import { transactions } from "./transactions";
import { invites } from "./invites";
