import { timestamp, pgTable, text, integer } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { z } from "zod";

// Groups are fixed and pre-defined - this table seeds the default groups
export const groupCodeEnum = z.enum([
  "essential",
  "lifestyle",
  "pleasures",
  "investments",
  "goals",
]);
export type GroupCode = z.infer<typeof groupCodeEnum>;

export const groups = pgTable("groups", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  code: text("code").$type<GroupCode>().notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  icon: text("icon"), // Emoji or icon identifier
  displayOrder: integer("display_order").notNull().default(0),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow(),
});

export const groupsRelations = relations(groups, ({ many }) => ({
  categories: many(categories),
}));

import { categories } from "./categories";

// Default groups data for seeding
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
    code: "pleasures",
    name: "Prazeres",
    description: "Diversão pessoal de cada membro. Cada pessoa tem sua própria subcategoria.",
    icon: "🎉",
    displayOrder: 3,
  },
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
