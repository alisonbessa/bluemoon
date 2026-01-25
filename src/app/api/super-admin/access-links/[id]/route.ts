import { NextRequest, NextResponse } from "next/server";
import withSuperAdminAuthRequired from "@/shared/lib/auth/withSuperAdminAuthRequired";
import { db } from "@/db";
import { accessLinks } from "@/db/schema/access-links";
import { users } from "@/db/schema/user";
import { eq } from "drizzle-orm";

/**
 * GET /api/super-admin/access-links/[id]
 *
 * Get a single access link by ID
 */
export const GET = withSuperAdminAuthRequired(async (_req, { params }) => {
  try {
    const { id } = await params;

    const [link] = await db
      .select({
        id: accessLinks.id,
        code: accessLinks.code,
        type: accessLinks.type,
        planType: accessLinks.planType,
        note: accessLinks.note,
        expired: accessLinks.expired,
        usedAt: accessLinks.usedAt,
        createdAt: accessLinks.createdAt,
        expiresAt: accessLinks.expiresAt,
        userId: accessLinks.userId,
        userName: users.name,
        userEmail: users.email,
      })
      .from(accessLinks)
      .leftJoin(users, eq(accessLinks.userId, users.id))
      .where(eq(accessLinks.id, id as string))
      .limit(1);

    if (!link) {
      return NextResponse.json(
        { error: "Access link not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ link });
  } catch (error) {
    console.error("Error fetching access link:", error);
    return NextResponse.json(
      { error: "Failed to fetch access link" },
      { status: 500 }
    );
  }
});

/**
 * PATCH /api/super-admin/access-links/[id]
 *
 * Update an access link (e.g., expire it)
 */
export const PATCH = withSuperAdminAuthRequired(async (req, { params }) => {
  try {
    const { id } = await params;
    const body = await req.json();

    // Check if link exists
    const [existingLink] = await db
      .select()
      .from(accessLinks)
      .where(eq(accessLinks.id, id as string))
      .limit(1);

    if (!existingLink) {
      return NextResponse.json(
        { error: "Access link not found" },
        { status: 404 }
      );
    }

    // Build update object
    const updateData: { expired?: boolean; note?: string } = {};

    if (body.expired !== undefined) {
      if (existingLink.usedAt && body.expired) {
        return NextResponse.json(
          { error: "Cannot expire a used access link" },
          { status: 400 }
        );
      }
      updateData.expired = body.expired;
    }

    if (body.note !== undefined) {
      updateData.note = body.note;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update" },
        { status: 400 }
      );
    }

    await db
      .update(accessLinks)
      .set(updateData)
      .where(eq(accessLinks.id, id as string));

    return NextResponse.json({
      success: true,
      message: "Access link updated successfully",
    });
  } catch (error) {
    console.error("Error updating access link:", error);
    return NextResponse.json(
      { error: "Failed to update access link" },
      { status: 500 }
    );
  }
});

/**
 * DELETE /api/super-admin/access-links/[id]
 *
 * Permanently delete an access link
 */
export const DELETE = withSuperAdminAuthRequired(async (_req, { params }) => {
  try {
    const { id } = await params;

    // Check if link exists
    const [existingLink] = await db
      .select()
      .from(accessLinks)
      .where(eq(accessLinks.id, id as string))
      .limit(1);

    if (!existingLink) {
      return NextResponse.json(
        { error: "Access link not found" },
        { status: 404 }
      );
    }

    // Actually delete the link
    await db
      .delete(accessLinks)
      .where(eq(accessLinks.id, id as string));

    return NextResponse.json({
      success: true,
      message: "Access link deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting access link:", error);
    return NextResponse.json(
      { error: "Failed to delete access link" },
      { status: 500 }
    );
  }
});
