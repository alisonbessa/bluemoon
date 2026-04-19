import { pgTable, text, timestamp, index } from "drizzle-orm/pg-core";
import { users } from "./user";

export const announcements = pgTable(
  "announcement",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    title: text("title").notNull(),
    body: text("body").notNull(),
    ctaLabel: text("cta_label"),
    ctaUrl: text("cta_url"),
    publishedAt: timestamp("published_at", { mode: "date" }),
    createdById: text("created_by_id").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { mode: "date" })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: timestamp("updated_at", { mode: "date" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [index("idx_announcement_published_at").on(table.publishedAt)]
);
