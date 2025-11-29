import { timestamp, pgTable, text, integer, index } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { budgets } from "./budgets";
import { users } from "./user";
import { z } from "zod";

export const memberTypeEnum = z.enum(["owner", "partner", "child", "pet"]);
export type MemberType = z.infer<typeof memberTypeEnum>;

export const budgetMembers = pgTable("budget_members", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  budgetId: text("budget_id")
    .notNull()
    .references(() => budgets.id, { onDelete: "cascade" }),
  userId: text("user_id").references(() => users.id, { onDelete: "cascade" }), // null for dependents (children/pets)
  name: text("name").notNull(),
  type: text("type").$type<MemberType>().notNull().default("owner"),
  color: text("color").default("#6366f1"), // For UI identification
  monthlyPleasureBudget: integer("monthly_pleasure_budget").default(0), // Monthly "Prazeres" budget in cents
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow(),
}, (table) => [
  index("idx_budget_members_user_id").on(table.userId),
  index("idx_budget_members_budget_id").on(table.budgetId),
]);

export const budgetMembersRelations = relations(budgetMembers, ({ one, many }) => ({
  budget: one(budgets, {
    fields: [budgetMembers.budgetId],
    references: [budgets.id],
  }),
  user: one(users, {
    fields: [budgetMembers.userId],
    references: [users.id],
  }),
  transactions: many(transactions),
}));

import { transactions } from "./transactions";
