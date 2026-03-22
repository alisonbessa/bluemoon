import { NextResponse } from "next/server";
import withSuperAdminAuthRequired from "@/shared/lib/auth/withSuperAdminAuthRequired";
import { createLogger } from "@/shared/lib/logger";
import { db } from "@/db";
import { blogPosts } from "@/db/schema/blog-posts";
import { desc, sql, eq } from "drizzle-orm";
import { blogPostFormSchema } from "@/shared/lib/validations/blog-post.schema";

const logger = createLogger("api:admin:blog");

export const GET = withSuperAdminAuthRequired(async (req) => {
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "";

    const offset = (page - 1) * limit;

    const conditions = [];
    if (search) {
      conditions.push(sql`(title ILIKE ${`%${search}%`} OR description ILIKE ${`%${search}%`})`);
    }
    if (status) {
      conditions.push(sql`status = ${status}`);
    }

    const whereClause = conditions.length > 0
      ? sql.join(conditions, sql` AND `)
      : sql`1=1`;

    const totalCountResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(blogPosts)
      .where(whereClause);

    const totalCount = totalCountResult[0].count;

    const posts = await db
      .select()
      .from(blogPosts)
      .where(whereClause)
      .orderBy(desc(blogPosts.createdAt))
      .limit(limit)
      .offset(offset);

    return NextResponse.json({
      posts,
      pagination: {
        total: totalCount,
        pageCount: Math.ceil(totalCount / limit),
        currentPage: page,
        perPage: limit,
      },
    });
  } catch (error) {
    logger.error("Error fetching blog posts:", error);
    return NextResponse.json(
      { error: "Failed to fetch blog posts" },
      { status: 500 }
    );
  }
});

export const POST = withSuperAdminAuthRequired(async (req) => {
  try {
    const data = await req.json();
    const validatedData = blogPostFormSchema.parse(data);

    const newPost = await db
      .insert(blogPosts)
      .values({
        ...validatedData,
        publishedAt: validatedData.status === "published"
          ? (validatedData.publishedAt ? new Date(validatedData.publishedAt) : new Date())
          : null,
      })
      .returning();

    return NextResponse.json(newPost[0]);
  } catch (error) {
    logger.error("Error creating blog post:", error);
    return NextResponse.json(
      { error: "Failed to create blog post" },
      { status: 500 }
    );
  }
});
