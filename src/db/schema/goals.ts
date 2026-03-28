import {
  timestamp,
  pgTable,
  text,
  integer,
  bigint,
  boolean,
  unique,
  index,
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
  // Conta de origem das contribuições mensais — usado em metas pessoais
  fromAccountId: text("from_account_id")
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
}, (table) => [
  index("idx_goals_budget_id").on(table.budgetId),
  index("idx_goals_member_id").on(table.memberId),
  index("idx_goals_budget_archived").on(table.budgetId, table.isArchived),
]);

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
  memberSettings: many(goalMemberSettings),
}));

// Configurações de contribuição por membro para metas conjuntas (Duo)
export const goalMemberSettings = pgTable(
  "goal_member_settings",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    goalId: text("goal_id")
      .references(() => goals.id, { onDelete: "cascade" })
      .notNull(),
    memberId: text("member_id")
      .references(() => budgetMembers.id, { onDelete: "cascade" })
      .notNull(),
    // Conta de onde sai o dinheiro do membro para esta meta
    fromAccountId: text("from_account_id")
      .references(() => financialAccounts.id, { onDelete: "set null" }),
    // Valor mensal fixo para este membro (null = automático / proporcional)
    monthlyAmount: bigint("monthly_amount", { mode: "number" }),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow(),
  },
  (table) => [
    unique("uq_goal_member_settings").on(table.goalId, table.memberId),
    index("idx_goal_member_settings_goal_id").on(table.goalId),
  ]
);

export const goalMemberSettingsRelations = relations(goalMemberSettings, ({ one }) => ({
  goal: one(goals, {
    fields: [goalMemberSettings.goalId],
    references: [goals.id],
  }),
  member: one(budgetMembers, {
    fields: [goalMemberSettings.memberId],
    references: [budgetMembers.id],
  }),
  fromAccount: one(financialAccounts, {
    fields: [goalMemberSettings.fromAccountId],
    references: [financialAccounts.id],
  }),
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
    // Membro que fez a contribuição
    memberId: text("member_id")
      .references(() => budgetMembers.id, { onDelete: "set null" }),
    // Conta de origem da contribuição (de onde saiu o dinheiro)
    fromAccountId: text("from_account_id")
      .references(() => financialAccounts.id, { onDelete: "set null" }),
    // Transação associada a esta contribuição
    transactionId: text("transaction_id")
      .references(() => transactions.id, { onDelete: "set null" }),
    year: integer("year").notNull(),
    month: integer("month").notNull(), // 1-12
    amount: bigint("amount", { mode: "number" }).notNull(), // Valor contribuído em centavos
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow(),
  },
  (table) => [
    index("idx_goal_contributions_goal_id").on(table.goalId),
    index("idx_goal_contributions_year_month").on(table.year, table.month),
    index("idx_goal_contributions_member_id").on(table.memberId),
  ]
);

export const goalContributionsRelations = relations(
  goalContributions,
  ({ one }) => ({
    goal: one(goals, {
      fields: [goalContributions.goalId],
      references: [goals.id],
    }),
    member: one(budgetMembers, {
      fields: [goalContributions.memberId],
      references: [budgetMembers.id],
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
