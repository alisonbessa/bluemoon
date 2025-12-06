import { timestamp, pgTable, text, integer, index } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { z } from "zod";
import { budgets } from "./budgets";
import { budgetMembers } from "./budget-members";

// Groups can be:
// 1. Global/system groups (code is set, budgetId/memberId are null) - essential, lifestyle, investments, goals
// 2. Personal groups (code is "personal", budgetId and memberId are set) - "Gastos pessoais - [Nome]"
export const groupCodeEnum = z.enum([
  "essential",
  "lifestyle",
  "personal", // Personal spending groups - each member gets their own
  "investments",
  "goals",
]);
export type GroupCode = z.infer<typeof groupCodeEnum>;

export const groups = pgTable("groups", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  code: text("code").$type<GroupCode>().notNull(),
  name: text("name").notNull(),
  description: text("description"),
  icon: text("icon"), // Emoji or icon identifier
  displayOrder: integer("display_order").notNull().default(0),
  // For personal groups - linked to a specific budget and member
  budgetId: text("budget_id").references(() => budgets.id, { onDelete: "cascade" }),
  memberId: text("member_id").references(() => budgetMembers.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow(),
}, (table) => [
  index("idx_groups_budget_id").on(table.budgetId),
  index("idx_groups_member_id").on(table.memberId),
]);

export const groupsRelations = relations(groups, ({ one, many }) => ({
  categories: many(categories),
  budget: one(budgets, {
    fields: [groups.budgetId],
    references: [budgets.id],
  }),
  member: one(budgetMembers, {
    fields: [groups.memberId],
    references: [budgetMembers.id],
  }),
}));

import { categories } from "./categories";

// Default groups data for seeding (global/system groups only)
// Personal groups ("Gastos pessoais - [Nome]") are created dynamically per member
export const defaultGroups: Array<{
  code: GroupCode;
  name: string;
  description: string;
  icon: string;
  displayOrder: number;
}> = [
  {
    code: "essential",
    name: "Essencial",
    description: "Gastos fixos e obrigatórios: moradia, contas, mercado, transporte, saúde, educação",
    icon: "📌",
    displayOrder: 1,
  },
  {
    code: "lifestyle",
    name: "Estilo de Vida",
    description: "Gastos variáveis de qualidade de vida: alimentação fora, vestuário, streaming, academia",
    icon: "🎨",
    displayOrder: 2,
  },
  // Note: "personal" groups (displayOrder 3) are created dynamically for each member
  {
    code: "investments",
    name: "Investimentos",
    description: "Reservas e aplicações: emergência, previdência, poupança, investimentos",
    icon: "💰",
    displayOrder: 4,
  },
  {
    code: "goals",
    name: "Metas",
    description: "Sonhos e objetivos com prazo: viagem, carro, casa, casamento",
    icon: "🎯",
    displayOrder: 5,
  },
];
