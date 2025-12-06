import {
  timestamp,
  pgTable,
  text,
  integer,
  boolean,
  unique,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { budgets } from "./budgets";

// Tabela principal de metas financeiras
export const goals = pgTable("goals", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  budgetId: text("budget_id")
    .references(() => budgets.id, { onDelete: "cascade" })
    .notNull(),
  name: text("name").notNull(),
  icon: text("icon").default("🎯"),
  color: text("color").default("#8b5cf6"),
  targetAmount: integer("target_amount").notNull(), // Valor alvo em centavos
  currentAmount: integer("current_amount").default(0), // Valor atual acumulado
  targetDate: timestamp("target_date", { mode: "date" }).notNull(),
  isCompleted: boolean("is_completed").default(false),
  completedAt: timestamp("completed_at", { mode: "date" }),
  isArchived: boolean("is_archived").default(false),
  displayOrder: integer("display_order").default(0),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow(),
});

export const goalsRelations = relations(goals, ({ one, many }) => ({
  budget: one(budgets, {
    fields: [goals.budgetId],
    references: [budgets.id],
  }),
  contributions: many(goalContributions),
}));

// Histórico de contribuições mensais para cada meta
export const goalContributions = pgTable(
  "goal_contributions",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    goalId: text("goal_id")
      .references(() => goals.id, { onDelete: "cascade" })
      .notNull(),
    year: integer("year").notNull(),
    month: integer("month").notNull(), // 1-12
    amount: integer("amount").notNull(), // Valor contribuído no mês em centavos
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow(),
  },
  (table) => [unique("goal_month_unique").on(table.goalId, table.year, table.month)]
);

export const goalContributionsRelations = relations(
  goalContributions,
  ({ one }) => ({
    goal: one(goals, {
      fields: [goalContributions.goalId],
      references: [goals.id],
    }),
  })
);
