import { timestamp, pgTable, text, integer, bigint, uniqueIndex, index } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { budgets } from "./budgets";
import { categories } from "./categories";

/**
 * Records that a budget-threshold alert was delivered for a given
 * category / year / month / threshold bucket, so the daily job does not
 * re-send the same alert repeatedly.
 */
export const budgetAlertsSent = pgTable("budget_alerts_sent", {
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
  month: integer("month").notNull(),
  // Threshold bucket in percent (e.g. 80, 100, 120) already notified.
  thresholdPct: integer("threshold_pct").notNull(),
  // Snapshot of what we observed when we sent the alert.
  spentCents: bigint("spent_cents", { mode: "number" }).notNull(),
  plannedCents: bigint("planned_cents", { mode: "number" }).notNull(),
  sentAt: timestamp("sent_at", { mode: "date" }).defaultNow(),
}, (table) => [
  uniqueIndex("uq_budget_alerts_sent_bucket").on(
    table.budgetId,
    table.categoryId,
    table.year,
    table.month,
    table.thresholdPct,
  ),
  index("idx_budget_alerts_sent_budget").on(table.budgetId),
]);

export const budgetAlertsSentRelations = relations(budgetAlertsSent, ({ one }) => ({
  budget: one(budgets, {
    fields: [budgetAlertsSent.budgetId],
    references: [budgets.id],
  }),
  category: one(categories, {
    fields: [budgetAlertsSent.categoryId],
    references: [categories.id],
  }),
}));

export type BudgetAlertSent = typeof budgetAlertsSent.$inferSelect;
export type NewBudgetAlertSent = typeof budgetAlertsSent.$inferInsert;
