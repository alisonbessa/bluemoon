import { timestamp, pgTable, text, integer, boolean } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { budgets } from "./budgets";
import { financialAccounts } from "./accounts";
import { categories } from "./categories";
import { budgetMembers } from "./budget-members";
import { z } from "zod";

export const financialTransactionTypeEnum = z.enum(["income", "expense", "transfer"]);
export type FinancialTransactionType = z.infer<typeof financialTransactionTypeEnum>;

export const financialTransactionStatusEnum = z.enum(["pending", "cleared", "reconciled"]);
export type FinancialTransactionStatus = z.infer<typeof financialTransactionStatusEnum>;

export const transactions = pgTable("transactions", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  budgetId: text("budget_id")
    .notNull()
    .references(() => budgets.id, { onDelete: "cascade" }),
  accountId: text("account_id")
    .notNull()
    .references(() => financialAccounts.id, { onDelete: "cascade" }),
  categoryId: text("category_id").references(() => categories.id, { onDelete: "set null" }), // null for transfers
  memberId: text("member_id").references(() => budgetMembers.id, { onDelete: "set null" }), // Who made the transaction

  // For transfers
  toAccountId: text("to_account_id").references(() => financialAccounts.id, { onDelete: "cascade" }),

  type: text("type").$type<FinancialTransactionType>().notNull(),
  status: text("status").$type<FinancialTransactionStatus>().notNull().default("pending"),

  amount: integer("amount").notNull(), // In cents (positive for income, negative for expense)
  description: text("description"),
  notes: text("notes"),

  date: timestamp("date", { mode: "date" }).notNull(),

  // Installment tracking
  isInstallment: boolean("is_installment").default(false),
  installmentNumber: integer("installment_number"), // Current installment (e.g., 3 of 12)
  totalInstallments: integer("total_installments"), // Total installments (e.g., 12)
  parentTransactionId: text("parent_transaction_id"), // Reference to original installment transaction

  // Source tracking (telegram, web, etc.)
  source: text("source").default("web"),

  createdAt: timestamp("created_at", { mode: "date" }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow(),
});

export const transactionsRelations = relations(transactions, ({ one, many }) => ({
  budget: one(budgets, {
    fields: [transactions.budgetId],
    references: [budgets.id],
  }),
  account: one(financialAccounts, {
    fields: [transactions.accountId],
    references: [financialAccounts.id],
  }),
  toAccount: one(financialAccounts, {
    fields: [transactions.toAccountId],
    references: [financialAccounts.id],
    relationName: "toAccount",
  }),
  category: one(categories, {
    fields: [transactions.categoryId],
    references: [categories.id],
  }),
  member: one(budgetMembers, {
    fields: [transactions.memberId],
    references: [budgetMembers.id],
  }),
  childInstallments: many(transactions, { relationName: "parentTransaction" }),
  parentTransaction: one(transactions, {
    fields: [transactions.parentTransactionId],
    references: [transactions.id],
    relationName: "parentTransaction",
  }),
}));
