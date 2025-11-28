import { timestamp, pgTable, text } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { budgets } from "./budgets";
import { users } from "./user";
import { z } from "zod";

export const inviteStatusEnum = z.enum(["pending", "accepted", "expired", "cancelled"]);
export type InviteStatus = z.infer<typeof inviteStatusEnum>;

export const invites = pgTable("invites", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  budgetId: text("budget_id")
    .notNull()
    .references(() => budgets.id, { onDelete: "cascade" }),
  invitedByUserId: text("invited_by_user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),

  email: text("email").notNull(),
  name: text("name"), // Optional name for the invitee

  token: text("token").notNull().unique(), // Magic link token
  status: text("status").$type<InviteStatus>().notNull().default("pending"),

  expiresAt: timestamp("expires_at", { mode: "date" }).notNull(),
  acceptedAt: timestamp("accepted_at", { mode: "date" }),

  createdAt: timestamp("created_at", { mode: "date" }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow(),
});

export const invitesRelations = relations(invites, ({ one }) => ({
  budget: one(budgets, {
    fields: [invites.budgetId],
    references: [budgets.id],
  }),
  invitedBy: one(users, {
    fields: [invites.invitedByUserId],
    references: [users.id],
  }),
}));
