import { timestamp, pgTable, text, integer, boolean, index } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { budgets } from "./budgets";
import { groups } from "./groups";
import { budgetMembers } from "./budget-members";
import { z } from "zod";

export const categoryBehaviorEnum = z.enum(["set_aside", "refill_up"]);
export type CategoryBehavior = z.infer<typeof categoryBehaviorEnum>;

export const categories = pgTable("categories", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  budgetId: text("budget_id")
    .notNull()
    .references(() => budgets.id, { onDelete: "cascade" }),
  groupId: text("group_id")
    .notNull()
    .references(() => groups.id),
  memberId: text("member_id").references(() => budgetMembers.id, { onDelete: "cascade" }), // For "Prazeres" categories linked to specific members
  name: text("name").notNull(),
  icon: text("icon"), // Emoji or icon identifier
  color: text("color").default("#6366f1"),

  // Budget behavior
  behavior: text("behavior").$type<CategoryBehavior>().notNull().default("refill_up"),
  plannedAmount: integer("planned_amount").notNull().default(0), // In cents
  dueDay: integer("due_day"), // Day of month when this expense is due (1-31)

  // For goals with target
  targetAmount: integer("target_amount"), // Target amount for goals (in cents)
  targetDate: timestamp("target_date", { mode: "date" }), // Target date for goals

  isArchived: boolean("is_archived").default(false),
  displayOrder: integer("display_order").notNull().default(0),

  createdAt: timestamp("created_at", { mode: "date" }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow(),
}, (table) => [
  index("idx_categories_budget_id").on(table.budgetId),
  index("idx_categories_group_id").on(table.groupId),
]);

export const categoriesRelations = relations(categories, ({ one, many }) => ({
  budget: one(budgets, {
    fields: [categories.budgetId],
    references: [budgets.id],
  }),
  group: one(groups, {
    fields: [categories.groupId],
    references: [groups.id],
  }),
  member: one(budgetMembers, {
    fields: [categories.memberId],
    references: [budgetMembers.id],
  }),
  transactions: many(transactions),
}));

import { transactions } from "./transactions";
