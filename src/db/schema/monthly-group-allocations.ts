import { timestamp, pgTable, text, integer, bigint, unique, index } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { budgets } from "./budgets";
import { groups } from "./groups";

/**
 * Monthly allocation ceiling per group.
 * Sets the maximum budget for a group (e.g., Essencial = R$ 5.000).
 * Categories within the group share this ceiling.
 */
export const monthlyGroupAllocations = pgTable("monthly_group_allocations", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  budgetId: text("budget_id")
    .notNull()
    .references(() => budgets.id, { onDelete: "cascade" }),
  groupId: text("group_id")
    .notNull()
    .references(() => groups.id),

  year: integer("year").notNull(),
  month: integer("month").notNull(), // 1-12

  allocated: bigint("allocated", { mode: "number" }).notNull().default(0), // Ceiling in cents

  createdAt: timestamp("created_at", { mode: "date" }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow(),
}, (table) => [
  unique("unique_group_allocation").on(table.budgetId, table.groupId, table.year, table.month),
  index("idx_monthly_group_allocations_budget").on(table.budgetId, table.year, table.month),
]);

export const monthlyGroupAllocationsRelations = relations(monthlyGroupAllocations, ({ one }) => ({
  budget: one(budgets, {
    fields: [monthlyGroupAllocations.budgetId],
    references: [budgets.id],
  }),
  group: one(groups, {
    fields: [monthlyGroupAllocations.groupId],
    references: [groups.id],
  }),
}));
