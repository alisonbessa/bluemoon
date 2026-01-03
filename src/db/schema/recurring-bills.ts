import { timestamp, pgTable, text, integer, boolean, index } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { budgets } from "./budgets";
import { categories } from "./categories";
import { financialAccounts } from "./accounts";
import { z } from "zod";

export const recurringBillFrequencyEnum = z.enum(["weekly", "monthly", "yearly"]);
export type RecurringBillFrequency = z.infer<typeof recurringBillFrequencyEnum>;

export const recurringBills = pgTable("recurring_bills", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  budgetId: text("budget_id")
    .notNull()
    .references(() => budgets.id, { onDelete: "cascade" }),
  categoryId: text("category_id")
    .notNull()
    .references(() => categories.id, { onDelete: "cascade" }),
  accountId: text("account_id")
    .references(() => financialAccounts.id, { onDelete: "set null" }), // conta de onde sai o pagamento

  name: text("name").notNull(), // "Aluguel", "Condominio", etc
  amount: integer("amount").notNull().default(0), // valor em centavos

  // Recurrence configuration
  frequency: text("frequency").$type<RecurringBillFrequency>().notNull().default("monthly"),
  dueDay: integer("due_day"), // dia do vencimento (1-31) para monthly
  dueMonth: integer("due_month"), // mes do vencimento (1-12) para yearly

  isActive: boolean("is_active").default(true),
  displayOrder: integer("display_order").notNull().default(0),

  createdAt: timestamp("created_at", { mode: "date" }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow(),
}, (table) => [
  index("idx_recurring_bills_budget_id").on(table.budgetId),
  index("idx_recurring_bills_category_id").on(table.categoryId),
]);

export const recurringBillsRelations = relations(recurringBills, ({ one }) => ({
  budget: one(budgets, {
    fields: [recurringBills.budgetId],
    references: [budgets.id],
  }),
  category: one(categories, {
    fields: [recurringBills.categoryId],
    references: [categories.id],
  }),
  account: one(financialAccounts, {
    fields: [recurringBills.accountId],
    references: [financialAccounts.id],
  }),
}));
