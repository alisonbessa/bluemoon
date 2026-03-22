import { NextResponse } from "next/server";
import withSuperAdminAuthRequired from "@/shared/lib/auth/withSuperAdminAuthRequired";
import { createLogger } from "@/shared/lib/logger";
import { db } from "@/db";
import { blogPosts } from "@/db/schema/blog-posts";
import { eq } from "drizzle-orm";
import { blogPostFormSchema } from "@/shared/lib/validations/blog-post.schema";

const logger = createLogger("api:admin:blog:[id]");

export const GET = withSuperAdminAuthRequired(async (req, context) => {
  try {
    const { id } = (await context.params) as { id: string };

    const post = await db
      .select()
      .from(blogPosts)
      .where(eq(blogPosts.id, id))
      .limit(1);

    if (post.length === 0) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    return NextResponse.json(post[0]);
  } catch (error) {
    logger.error("Error fetching blog post:", error);
    return NextResponse.json(
      { error: "Failed to fetch blog post" },
      { status: 500 }
    );
  }
});

export const PUT = withSuperAdminAuthRequired(async (req, context) => {
  try {
    const { id } = (await context.params) as { id: string };
    const data = await req.json();
    const validatedData = blogPostFormSchema.parse(data);

    const updatedPost = await db
      .update(blogPosts)
      .set({
        ...validatedData,
        publishedAt: validatedData.status === "published"
          ? (validatedData.publishedAt ? new Date(validatedData.publishedAt) : new Date())
          : null,
        updatedAt: new Date(),
      })
      .where(eq(blogPosts.id, id))
      .returning();

    if (updatedPost.length === 0) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    return NextResponse.json(updatedPost[0]);
  } catch (error) {
    logger.error("Error updating blog post:", error);
    return NextResponse.json(
      { error: "Failed to update blog post" },
      { status: 500 }
    );
  }
});

export const DELETE = withSuperAdminAuthRequired(async (req, context) => {
  try {
    const { id } = (await context.params) as { id: string };

    await db.delete(blogPosts).where(eq(blogPosts.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("Error deleting blog post:", error);
    return NextResponse.json(
      { error: "Failed to delete blog post" },
      { status: 500 }
    );
  }
});
