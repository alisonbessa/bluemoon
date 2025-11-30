import { timestamp, pgTable, text, integer, boolean, index } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { budgets } from "./budgets";
import { financialAccounts } from "./accounts";
import { categories } from "./categories";
import { budgetMembers } from "./budget-members";
import { incomeSources } from "./income-sources";
import { z } from "zod";

export const financialTransactionTypeEnum = z.enum(["income", "expense", "transfer"]);
export type FinancialTransactionType = z.infer<typeof financialTransactionTypeEnum>;

export const financialTransactionStatusEnum = z.enum(["pending", "cleared", "reconciled"]);
export type FinancialTransactionStatus = z.infer<typeof financialTransactionStatusEnum>;

export const recurrenceTypeEnum = z.enum(["weekly", "monthly", "yearly"]);
export type RecurrenceType = z.infer<typeof recurrenceTypeEnum>;

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
  categoryId: text("category_id").references(() => categories.id, { onDelete: "set null" }), // For expense transactions (null for transfers and income)
  incomeSourceId: text("income_source_id").references(() => incomeSources.id, { onDelete: "set null" }), // For income transactions
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

  // Recurrence tracking
  isRecurring: boolean("is_recurring").default(false),
  recurrenceType: text("recurrence_type").$type<RecurrenceType>(), // weekly, monthly, yearly
  recurrenceDay: integer("recurrence_day"), // Day of month (1-31) or day of week (0-6)
  recurrenceEndDate: timestamp("recurrence_end_date", { mode: "date" }), // When recurrence ends (null = never)
  recurrenceParentId: text("recurrence_parent_id"), // Reference to the original recurring transaction

  // Source tracking (telegram, web, etc.)
  source: text("source").default("web"),

  createdAt: timestamp("created_at", { mode: "date" }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow(),
}, (table) => [
  index("idx_transactions_budget_id").on(table.budgetId),
  index("idx_transactions_account_id").on(table.accountId),
  index("idx_transactions_category_id").on(table.categoryId),
  index("idx_transactions_date").on(table.date),
  index("idx_transactions_income_source_id").on(table.incomeSourceId),
]);

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
  incomeSource: one(incomeSources, {
    fields: [transactions.incomeSourceId],
    references: [incomeSources.id],
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
  childRecurrences: many(transactions, { relationName: "recurrenceParent" }),
  recurrenceParent: one(transactions, {
    fields: [transactions.recurrenceParentId],
    references: [transactions.id],
    relationName: "recurrenceParent",
  }),
}));
