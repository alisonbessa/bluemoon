import {
  timestamp,
  pgTable,
  text,
  integer,
  bigint,
  boolean,
  unique,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { budgets } from "./budgets";
import { budgetMembers } from "./budget-members";
import { financialAccounts } from "./accounts";
import { transactions } from "./transactions";

// Tabela principal de metas financeiras
export const goals = pgTable("goals", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  budgetId: text("budget_id")
    .references(() => budgets.id, { onDelete: "cascade" })
    .notNull(),
  // Membro dono da meta (null = meta conjunta do casal)
  memberId: text("member_id").references(() => budgetMembers.id, { onDelete: "cascade" }),
  // Conta onde o dinheiro da meta é guardado (ex: poupança, investimento)
  accountId: text("account_id")
    .references(() => financialAccounts.id, { onDelete: "set null" }),
  name: text("name").notNull(),
  icon: text("icon").default("🎯"),
  color: text("color").default("#8b5cf6"),
  targetAmount: bigint("target_amount", { mode: "number" }).notNull(), // Valor alvo em centavos (bigint para metas de longo prazo)
  currentAmount: bigint("current_amount", { mode: "number" }).default(0), // Valor atual acumulado
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
  member: one(budgetMembers, {
    fields: [goals.memberId],
    references: [budgetMembers.id],
  }),
  account: one(financialAccounts, {
    fields: [goals.accountId],
    references: [financialAccounts.id],
  }),
  contributions: many(goalContributions),
}));

// Histórico de contribuições para cada meta
export const goalContributions = pgTable(
  "goal_contributions",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    goalId: text("goal_id")
      .references(() => goals.id, { onDelete: "cascade" })
      .notNull(),
    // Conta de origem da contribuição (de onde saiu o dinheiro)
    fromAccountId: text("from_account_id")
      .references(() => financialAccounts.id, { onDelete: "set null" }),
    // Transação associada a esta contribuição
    transactionId: text("transaction_id")
      .references(() => transactions.id, { onDelete: "set null" }),
    year: integer("year").notNull(),
    month: integer("month").notNull(), // 1-12
    amount: integer("amount").notNull(), // Valor contribuído em centavos
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow(),
  }
);

export const goalContributionsRelations = relations(
  goalContributions,
  ({ one }) => ({
    goal: one(goals, {
      fields: [goalContributions.goalId],
      references: [goals.id],
    }),
    fromAccount: one(financialAccounts, {
      fields: [goalContributions.fromAccountId],
      references: [financialAccounts.id],
    }),
    transaction: one(transactions, {
      fields: [goalContributions.transactionId],
      references: [transactions.id],
    }),
  })
);
