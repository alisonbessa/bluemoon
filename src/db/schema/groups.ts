import { timestamp, pgTable, text, integer, index, uniqueIndex } from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import { z } from "zod";

// Fixed codes only apply to the 4 global groups (pleasures is removed — replaced by personal groups per member)
export const groupCodeEnum = z.enum([
  "essential",
  "lifestyle",
  "investments",
  "goals",
]);
export type GroupCode = z.infer<typeof groupCodeEnum>;

export const groups = pgTable("groups", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  // null = global group (shared across all budgets); set = belongs to a specific budget (personal groups)
  budgetId: text("budget_id").references(() => budgets.id, { onDelete: "cascade" }),
  // null = shared group; set = personal group for this member only
  memberId: text("member_id").references(() => budgetMembers.id, { onDelete: "cascade" }),
  // Only global groups have a code; personal groups have code = null
  code: text("code").$type<GroupCode | null>(),
  name: text("name").notNull(),
  description: text("description"),
  icon: text("icon"),
  displayOrder: integer("display_order").notNull().default(0),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow(),
}, (table) => [
  // Global groups: code must be unique (only when budgetId IS NULL)
  uniqueIndex("uq_groups_global_code")
    .on(table.code)
    .where(sql`${table.budgetId} IS NULL AND ${table.code} IS NOT NULL`),
  // Each member can only have one personal group per budget
  uniqueIndex("uq_groups_member_budget")
    .on(table.budgetId, table.memberId)
    .where(sql`${table.memberId} IS NOT NULL`),
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
import { budgets } from "./budgets";
import { budgetMembers } from "./budget-members";

// Default global groups data for seeding (no personal groups here — those are created per member during onboarding)
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
  {
    code: "investments",
    name: "Investimentos",
    description: "Reservas e aplicações: emergência, previdência, poupança, investimentos",
    icon: "💰",
    displayOrder: 3,
  },
  {
    code: "goals",
    name: "Metas",
    description: "Sonhos e objetivos com prazo: viagem, carro, casa, casamento",
    icon: "🎯",
    displayOrder: 4,
  },
];
