import { timestamp, pgTable, text, integer, boolean } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { budgets } from "./budgets";
import { z } from "zod";

export const accountTypeEnum = z.enum([
  "checking", // Conta corrente
  "savings", // Poupança
  "credit_card", // Cartão de crédito
  "cash", // Dinheiro
  "investment", // Investimento
]);
export type AccountType = z.infer<typeof accountTypeEnum>;

export const financialAccounts = pgTable("financial_accounts", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  budgetId: text("budget_id")
    .notNull()
    .references(() => budgets.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  type: text("type").$type<AccountType>().notNull(),
  color: text("color").default("#6366f1"),
  icon: text("icon"), // Emoji or icon identifier

  // Balance tracking (in cents)
  balance: integer("balance").notNull().default(0),
  clearedBalance: integer("cleared_balance").notNull().default(0), // Reconciled balance

  // Credit card specific fields
  creditLimit: integer("credit_limit"), // In cents
  closingDay: integer("closing_day"), // Day of month (1-31)
  dueDay: integer("due_day"), // Day of month (1-31)

  isArchived: boolean("is_archived").default(false),
  displayOrder: integer("display_order").notNull().default(0),

  createdAt: timestamp("created_at", { mode: "date" }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow(),
});

export const financialAccountsRelations = relations(financialAccounts, ({ one, many }) => ({
  budget: one(budgets, {
    fields: [financialAccounts.budgetId],
    references: [budgets.id],
  }),
  transactions: many(transactions),
  transfersFrom: many(transactions, { relationName: "fromAccount" }),
  transfersTo: many(transactions, { relationName: "toAccount" }),
}));

import { transactions } from "./transactions";
