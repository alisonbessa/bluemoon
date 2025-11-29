import { timestamp, pgTable, text, integer, unique, index } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { budgets } from "./budgets";
import { categories } from "./categories";

export const monthlyAllocations = pgTable("monthly_allocations", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  budgetId: text("budget_id")
    .notNull()
    .references(() => budgets.id, { onDelete: "cascade" }),
  categoryId: text("category_id")
    .notNull()
    .references(() => categories.id, { onDelete: "cascade" }),

  year: integer("year").notNull(),
  month: integer("month").notNull(), // 1-12

  // Valores em centavos
  allocated: integer("allocated").notNull().default(0), // Valor alocado neste mês
  carriedOver: integer("carried_over").notNull().default(0), // Valor que veio do mês anterior (para set_aside)

  createdAt: timestamp("created_at", { mode: "date" }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow(),
}, (table) => [
  unique("unique_allocation").on(table.budgetId, table.categoryId, table.year, table.month),
  index("idx_monthly_allocations_budget_id").on(table.budgetId),
  index("idx_monthly_allocations_category_id").on(table.categoryId),
  index("idx_monthly_allocations_year_month").on(table.year, table.month),
]);

export const monthlyAllocationsRelations = relations(monthlyAllocations, ({ one }) => ({
  budget: one(budgets, {
    fields: [monthlyAllocations.budgetId],
    references: [budgets.id],
  }),
  category: one(categories, {
    fields: [monthlyAllocations.categoryId],
    references: [categories.id],
  }),
}));
