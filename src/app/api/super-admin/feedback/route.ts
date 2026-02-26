import { NextResponse } from "next/server";
import withSuperAdminAuthRequired from "@/shared/lib/auth/withSuperAdminAuthRequired";
import { createLogger } from "@/shared/lib/logger";
import { db } from "@/db";
import { feedbacks } from "@/db/schema/feedback";
import { users } from "@/db/schema/user";
import { desc, sql, eq, and, ilike, or, type SQL } from "drizzle-orm";

const logger = createLogger("api:admin:feedback");

export const GET = withSuperAdminAuthRequired(async (req) => {
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const search = searchParams.get("search") || "";
    const type = searchParams.get("type") || "";
    const status = searchParams.get("status") || "";

    const offset = (page - 1) * limit;

    // Build where conditions safely
    const conditions: SQL[] = [];

    if (search) {
      conditions.push(
        or(
          ilike(feedbacks.message, `%${search}%`),
          ilike(users.name, `%${search}%`),
          ilike(users.email, `%${search}%`)
        )!
      );
    }
    if (type) {
      conditions.push(eq(feedbacks.type, type as "bug" | "suggestion" | "other"));
    }
    if (status) {
      conditions.push(eq(feedbacks.status, status as "new" | "read" | "resolved"));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Get total count
    const totalCountResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(feedbacks)
      .leftJoin(users, eq(feedbacks.userId, users.id))
      .where(whereClause);

    const totalCount = Number(totalCountResult[0].count);

    // Get paginated feedback with user info
    const feedbackList = await db
      .select({
        id: feedbacks.id,
        userId: feedbacks.userId,
        type: feedbacks.type,
        message: feedbacks.message,
        page: feedbacks.page,
        status: feedbacks.status,
        createdAt: feedbacks.createdAt,
        readAt: feedbacks.readAt,
        resolvedAt: feedbacks.resolvedAt,
        userName: users.name,
        userEmail: users.email,
        userImage: users.image,
      })
      .from(feedbacks)
      .leftJoin(users, eq(feedbacks.userId, users.id))
      .where(whereClause)
      .orderBy(desc(feedbacks.createdAt))
      .limit(limit)
      .offset(offset);

    return NextResponse.json({
      feedbacks: feedbackList,
      pagination: {
        total: totalCount,
        pageCount: Math.ceil(totalCount / limit),
        currentPage: page,
        perPage: limit,
      },
    });
  } catch (error) {
    logger.error("Error fetching feedback:", error);
    return NextResponse.json(
      { error: "Failed to fetch feedback" },
      { status: 500 }
    );
  }
});

// Update feedback status
export const PATCH = withSuperAdminAuthRequired(async (req) => {
  try {
    const { id, status } = await req.json();

    const updateData: Record<string, unknown> = {};

    if (status === "read") {
      updateData.status = "read";
      updateData.readAt = new Date();
    } else if (status === "resolved") {
      updateData.status = "resolved";
      updateData.resolvedAt = new Date();
    } else if (status === "new") {
      updateData.status = "new";
      updateData.readAt = null;
      updateData.resolvedAt = null;
    }

    const [updated] = await db
      .update(feedbacks)
      .set(updateData)
      .where(eq(feedbacks.id, id))
      .returning();

    return NextResponse.json(updated);
  } catch (error) {
    logger.error("Error updating feedback:", error);
    return NextResponse.json(
      { error: "Failed to update feedback" },
      { status: 500 }
    );
  }
});

// Delete feedback
export const DELETE = withSuperAdminAuthRequired(async (req) => {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Feedback ID is required" },
        { status: 400 }
      );
    }

    await db.delete(feedbacks).where(eq(feedbacks.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("Error deleting feedback:", error);
    return NextResponse.json(
      { error: "Failed to delete feedback" },
      { status: 500 }
    );
  }
});
