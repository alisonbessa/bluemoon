import { pgTable, text, timestamp, index } from "drizzle-orm/pg-core";
import { users } from "./user";

export const feedbacks = pgTable("feedback", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  type: text("type").$type<"bug" | "suggestion" | "other">().notNull(),
  message: text("message").notNull(),
  page: text("page"),
  status: text("status").$type<"new" | "read" | "resolved">().notNull().default("new"),
  createdAt: timestamp("created_at", { mode: "date" })
    .notNull()
    .$defaultFn(() => new Date()),
  readAt: timestamp("read_at", { mode: "date" }),
  resolvedAt: timestamp("resolved_at", { mode: "date" }),
}, (table) => [
  index("idx_feedback_user_id").on(table.userId),
  index("idx_feedback_status").on(table.status),
  index("idx_feedback_created_at").on(table.createdAt),
]);
