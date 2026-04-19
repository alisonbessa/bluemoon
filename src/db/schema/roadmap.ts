import {
  pgTable,
  text,
  timestamp,
  integer,
  boolean,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { users } from "./user";

export const ROADMAP_STATUSES = ["voting", "planned", "in_progress", "implemented"] as const;
export type RoadmapStatus = (typeof ROADMAP_STATUSES)[number];

export const ROADMAP_SOURCES = ["admin", "user"] as const;
export type RoadmapSource = (typeof ROADMAP_SOURCES)[number];

export const roadmapItems = pgTable(
  "roadmap_item",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    title: text("title").notNull(),
    description: text("description").notNull(),
    status: text("status").$type<RoadmapStatus>().notNull().default("voting"),
    source: text("source").$type<RoadmapSource>().notNull(),
    category: text("category"),
    userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
    isAnonymous: boolean("is_anonymous").notNull().default(false),
    upvotes: integer("upvotes").notNull().default(0),
    commentsCount: integer("comments_count").notNull().default(0),
    adminNotes: text("admin_notes"),
    createdAt: timestamp("created_at", { mode: "date" })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: timestamp("updated_at", { mode: "date" })
      .notNull()
      .$defaultFn(() => new Date()),
    implementedAt: timestamp("implemented_at", { mode: "date" }),
  },
  (table) => [
    index("idx_roadmap_status").on(table.status),
    index("idx_roadmap_source").on(table.source),
    index("idx_roadmap_user_id").on(table.userId),
    index("idx_roadmap_created_at").on(table.createdAt),
  ]
);

export const roadmapVotes = pgTable(
  "roadmap_vote",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    itemId: text("item_id")
      .notNull()
      .references(() => roadmapItems.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { mode: "date" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [
    uniqueIndex("uniq_roadmap_vote_item_user").on(table.itemId, table.userId),
    index("idx_roadmap_vote_item").on(table.itemId),
  ]
);

export const roadmapComments = pgTable(
  "roadmap_comment",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    itemId: text("item_id")
      .notNull()
      .references(() => roadmapItems.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    content: text("content").notNull(),
    isAnonymous: boolean("is_anonymous").notNull().default(false),
    createdAt: timestamp("created_at", { mode: "date" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [
    index("idx_roadmap_comment_item").on(table.itemId),
    index("idx_roadmap_comment_created").on(table.createdAt),
  ]
);
