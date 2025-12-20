import { timestamp, pgTable, text, integer, unique, index } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { budgets } from "./budgets";
import { z } from "zod";

export const monthlyBudgetStatusEnum = z.enum(["planning", "active", "closed"]);
export type MonthlyBudgetStatus = z.infer<typeof monthlyBudgetStatusEnum>;

export const monthlyBudgetStatus = pgTable("monthly_budget_status", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  budgetId: text("budget_id")
    .notNull()
    .references(() => budgets.id, { onDelete: "cascade" }),

  year: integer("year").notNull(),
  month: integer("month").notNull(), // 1-12

  status: text("status").$type<MonthlyBudgetStatus>().notNull().default("planning"),

  // Timestamps
  startedAt: timestamp("started_at", { mode: "date" }), // When user clicked "Start Month"
  closedAt: timestamp("closed_at", { mode: "date" }), // When month was closed/finalized
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow(),
}, (table) => [
  unique("unique_monthly_status").on(table.budgetId, table.year, table.month),
  index("idx_monthly_budget_status_budget_id").on(table.budgetId),
  index("idx_monthly_budget_status_year_month").on(table.year, table.month),
]);

export const monthlyBudgetStatusRelations = relations(monthlyBudgetStatus, ({ one }) => ({
  budget: one(budgets, {
    fields: [monthlyBudgetStatus.budgetId],
    references: [budgets.id],
  }),
}));
