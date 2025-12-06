import { timestamp, pgTable, text, index } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { budgets } from "./budgets";
import { users } from "./user";
import { budgetMembers } from "./budget-members";
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
  invitedByMemberId: text("invited_by_member_id")
    .references(() => budgetMembers.id, { onDelete: "set null" }),

  email: text("email"), // Optional - for directed invites
  name: text("name"), // Optional name for the invitee

  token: text("token").notNull().unique(), // Magic link token
  status: text("status").$type<InviteStatus>().notNull().default("pending"),

  expiresAt: timestamp("expires_at", { mode: "date" }).notNull(),
  acceptedAt: timestamp("accepted_at", { mode: "date" }),
  acceptedByUserId: text("accepted_by_user_id").references(() => users.id, { onDelete: "set null" }),

  createdAt: timestamp("created_at", { mode: "date" }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow(),
}, (table) => [
  index("idx_invites_budget_id").on(table.budgetId),
  index("idx_invites_token").on(table.token),
  index("idx_invites_status").on(table.status),
]);

export const invitesRelations = relations(invites, ({ one }) => ({
  budget: one(budgets, {
    fields: [invites.budgetId],
    references: [budgets.id],
  }),
  invitedBy: one(users, {
    fields: [invites.invitedByUserId],
    references: [users.id],
  }),
  invitedByMember: one(budgetMembers, {
    fields: [invites.invitedByMemberId],
    references: [budgetMembers.id],
  }),
  acceptedByUser: one(users, {
    fields: [invites.acceptedByUserId],
    references: [users.id],
  }),
}));
