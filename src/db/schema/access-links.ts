import { timestamp, pgTable, text, boolean, index } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { users } from "./user";
import { z } from "zod";

export const accessLinkTypeEnum = z.enum(["lifetime", "beta"]);
export type AccessLinkType = z.infer<typeof accessLinkTypeEnum>;

export const accessLinkPlanTypeEnum = z.enum(["solo", "duo"]);
export type AccessLinkPlanType = z.infer<typeof accessLinkPlanTypeEnum>;

export const accessLinks = pgTable("access_links", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  code: text("code").unique().notNull(),
  type: text("type").$type<AccessLinkType>().notNull().default("lifetime"),
  planType: text("plan_type").$type<AccessLinkPlanType>(), // Chosen when redeemed

  // Who used this link
  userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
  usedAt: timestamp("used_at", { mode: "date" }),

  // Who created this link
  createdBy: text("created_by").references(() => users.id, { onDelete: "set null" }),
  note: text("note"),

  // Status
  expired: boolean("expired").default(false),

  createdAt: timestamp("created_at", { mode: "date" }).defaultNow(),
  expiresAt: timestamp("expires_at", { mode: "date" }),
}, (table) => [
  index("idx_access_links_code").on(table.code),
  index("idx_access_links_user_id").on(table.userId),
]);

export const accessLinksRelations = relations(accessLinks, ({ one }) => ({
  user: one(users, {
    fields: [accessLinks.userId],
    references: [users.id],
  }),
  createdByUser: one(users, {
    fields: [accessLinks.createdBy],
    references: [users.id],
    relationName: "createdByUser",
  }),
}));
