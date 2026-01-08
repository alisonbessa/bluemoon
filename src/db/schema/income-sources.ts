import { timestamp, pgTable, text, integer, boolean } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { budgets } from "./budgets";
import { budgetMembers } from "./budget-members";
import { financialAccounts } from "./accounts";
import { z } from "zod";

export const incomeTypeEnum = z.enum([
  "salary", // Salário
  "benefit", // Benefício (VR, VA)
  "freelance", // Freelance/Autônomo
  "rental", // Aluguel recebido
  "investment", // Rendimentos de investimento
  "other", // Outros
]);
export type IncomeType = z.infer<typeof incomeTypeEnum>;

export const incomeFrequencyEnum = z.enum([
  "monthly", // Mensal
  "biweekly", // Quinzenal
  "weekly", // Semanal
]);
export type IncomeFrequency = z.infer<typeof incomeFrequencyEnum>;

export const incomeSources = pgTable("income_sources", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  budgetId: text("budget_id")
    .notNull()
    .references(() => budgets.id, { onDelete: "cascade" }),
  memberId: text("member_id").references(() => budgetMembers.id, { onDelete: "set null" }), // Quem recebe
  accountId: text("account_id").references(() => financialAccounts.id, { onDelete: "set null" }), // Onde cai o dinheiro

  name: text("name").notNull(), // "Salário João", "VR Maria"
  type: text("type").$type<IncomeType>().notNull().default("salary"),
  amount: integer("amount").notNull().default(0), // Em centavos

  // Recorrência
  frequency: text("frequency").$type<IncomeFrequency>().notNull().default("monthly"),
  dayOfMonth: integer("day_of_month"), // Dia do pagamento (1-31)

  // Confirmação automática
  isAutoConfirm: boolean("is_auto_confirm").default(false), // Confirmar automaticamente no dia

  isActive: boolean("is_active").default(true),
  displayOrder: integer("display_order").notNull().default(0),

  createdAt: timestamp("created_at", { mode: "date" }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow(),
});

export const incomeSourcesRelations = relations(incomeSources, ({ one }) => ({
  budget: one(budgets, {
    fields: [incomeSources.budgetId],
    references: [budgets.id],
  }),
  member: one(budgetMembers, {
    fields: [incomeSources.memberId],
    references: [budgetMembers.id],
  }),
  account: one(financialAccounts, {
    fields: [incomeSources.accountId],
    references: [financialAccounts.id],
  }),
}));
