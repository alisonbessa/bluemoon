import { timestamp, pgTable, text, integer, bigint, boolean, index } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { budgets } from "./budgets";
import { budgetMembers } from "./budget-members";
import { z } from "zod";

export const accountTypeEnum = z.enum([
  "checking", // Conta corrente
  "savings", // Poupança
  "credit_card", // Cartão de crédito
  "cash", // Dinheiro
  "investment", // Investimento
  "benefit", // Benefício (VR, VA, etc)
]);
export type AccountType = z.infer<typeof accountTypeEnum>;

export const financialAccounts = pgTable("financial_accounts", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  budgetId: text("budget_id")
    .notNull()
    .references(() => budgets.id, { onDelete: "cascade" }),
  ownerId: text("owner_id").references(() => budgetMembers.id, { onDelete: "set null" }), // Member who owns this account
  name: text("name").notNull(),
  type: text("type").$type<AccountType>().notNull(),
  color: text("color").default("#6366f1"),
  icon: text("icon"), // Emoji or icon identifier

  // Balance tracking (in cents) - using bigint to support up to R$ 10 billion
  balance: bigint("balance", { mode: "number" }).notNull().default(0),
  clearedBalance: bigint("cleared_balance", { mode: "number" }).notNull().default(0), // Reconciled balance

  // Credit card specific fields
  creditLimit: bigint("credit_limit", { mode: "number" }), // In cents
  closingDay: integer("closing_day"), // Day of month (1-31)
  dueDay: integer("due_day"), // Day of month (1-31)
  paymentAccountId: text("payment_account_id"), // Account used to pay this credit card (self-reference)

  // Benefit specific fields (VR, VA, etc)
  monthlyDeposit: bigint("monthly_deposit", { mode: "number" }), // In cents - value deposited each month
  depositDay: integer("deposit_day"), // Day of month (1-31) when benefit is deposited

  isArchived: boolean("is_archived").default(false),
  displayOrder: integer("display_order").notNull().default(0),

  createdAt: timestamp("created_at", { mode: "date" }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow(),
}, (table) => [
  index("idx_financial_accounts_budget_id").on(table.budgetId),
]);

export const financialAccountsRelations = relations(financialAccounts, ({ one, many }) => ({
  budget: one(budgets, {
    fields: [financialAccounts.budgetId],
    references: [budgets.id],
  }),
  owner: one(budgetMembers, {
    fields: [financialAccounts.ownerId],
    references: [budgetMembers.id],
  }),
  paymentAccount: one(financialAccounts, {
    fields: [financialAccounts.paymentAccountId],
    references: [financialAccounts.id],
    relationName: "paymentAccount",
  }),
  creditCardsToPayFrom: many(financialAccounts, { relationName: "paymentAccount" }),
  transactions: many(transactions),
  transfersFrom: many(transactions, { relationName: "fromAccount" }),
  transfersTo: many(transactions, { relationName: "toAccount" }),
}));

import { transactions } from "./transactions";
