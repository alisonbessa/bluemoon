import { pgTable, text, timestamp, index } from "drizzle-orm/pg-core";

export const blogPostStatusEnum = ["draft", "published", "archived"] as const;
export type BlogPostStatus = (typeof blogPostStatusEnum)[number];

export const blogPosts = pgTable(
  "blog_post",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    title: text("title").notNull(),
    slug: text("slug").notNull().unique(),
    description: text("description"),
    content: text("content").notNull(),
    featuredImage: text("featured_image"),
    tags: text("tags")
      .array()
      .notNull()
      .$defaultFn(() => []),
    status: text("status").$type<BlogPostStatus>().notNull().default("draft"),
    seoTitle: text("seo_title"),
    seoDescription: text("seo_description"),
    seoKeywords: text("seo_keywords").array(),
    authorName: text("author_name").notNull().default("HiveBudget"),
    publishedAt: timestamp("published_at", { mode: "date" }),
    createdAt: timestamp("created_at", { mode: "date" })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: timestamp("updated_at", { mode: "date" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [
    index("idx_blog_posts_slug").on(table.slug),
    index("idx_blog_posts_status").on(table.status),
    index("idx_blog_posts_published_at").on(table.publishedAt),
  ]
);
