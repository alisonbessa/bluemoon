import { timestamp, pgTable, text, integer, unique, index } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { budgets } from "./budgets";
import { incomeSources } from "./income-sources";

// Monthly income allocation overrides
// Allows users to set different income amounts per month
export const monthlyIncomeAllocations = pgTable("monthly_income_allocations", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  budgetId: text("budget_id")
    .notNull()
    .references(() => budgets.id, { onDelete: "cascade" }),
  incomeSourceId: text("income_source_id")
    .notNull()
    .references(() => incomeSources.id, { onDelete: "cascade" }),

  year: integer("year").notNull(),
  month: integer("month").notNull(), // 1-12

  // Valor em centavos - override do valor padrão da fonte de renda
  planned: integer("planned").notNull().default(0),

  createdAt: timestamp("created_at", { mode: "date" }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow(),
}, (table) => [
  unique("unique_income_allocation").on(table.budgetId, table.incomeSourceId, table.year, table.month),
  index("idx_monthly_income_allocations_budget_id").on(table.budgetId),
  index("idx_monthly_income_allocations_income_source_id").on(table.incomeSourceId),
  index("idx_monthly_income_allocations_year_month").on(table.year, table.month),
]);

export const monthlyIncomeAllocationsRelations = relations(monthlyIncomeAllocations, ({ one }) => ({
  budget: one(budgets, {
    fields: [monthlyIncomeAllocations.budgetId],
    references: [budgets.id],
  }),
  incomeSource: one(incomeSources, {
    fields: [monthlyIncomeAllocations.incomeSourceId],
    references: [incomeSources.id],
  }),
}));
