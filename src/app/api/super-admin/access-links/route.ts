import { NextRequest, NextResponse } from "next/server";
import withSuperAdminAuthRequired from "@/shared/lib/auth/withSuperAdminAuthRequired";
import { db } from "@/db";
import { accessLinks, accessLinkTypeEnum } from "@/db/schema/access-links";
import { users } from "@/db/schema/user";
import { eq, desc, isNull, and } from "drizzle-orm";
import { z } from "zod";
import crypto from "crypto";

/**
 * GET /api/super-admin/access-links
 *
 * List all access links with user information
 */
export const GET = withSuperAdminAuthRequired(async () => {
  try {
    const links = await db
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
      .orderBy(desc(accessLinks.createdAt));

    // Group by status
    const available = links.filter((l) => !l.usedAt && !l.expired);
    const used = links.filter((l) => l.usedAt);
    const expiredLinks = links.filter((l) => l.expired && !l.usedAt);

    return NextResponse.json({
      links,
      stats: {
        total: links.length,
        available: available.length,
        used: used.length,
        expired: expiredLinks.length,
      },
    });
  } catch (error) {
    console.error("Error fetching access links:", error);
    return NextResponse.json(
      { error: "Failed to fetch access links" },
      { status: 500 }
    );
  }
});

const createAccessLinkSchema = z.object({
  type: accessLinkTypeEnum.default("lifetime"),
  note: z.string().optional(),
  expiresAt: z.string().datetime().optional(),
  count: z.number().min(1).max(100).default(1),
});

/**
 * POST /api/super-admin/access-links
 *
 * Create new access link(s)
 */
export const POST = withSuperAdminAuthRequired(async (req, { session }) => {
  try {
    const body = await req.json();
    const { type, note, expiresAt, count } = createAccessLinkSchema.parse(body);

    // Get current user ID for createdBy
    const currentUser = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, session.user!.email!))
      .limit(1);

    const createdById = currentUser[0]?.id ?? null;

    // Generate unique codes
    const createdLinks = [];
    for (let i = 0; i < count; i++) {
      const code = generateAccessCode();

      const [link] = await db
        .insert(accessLinks)
        .values({
          code,
          type,
          note,
          expiresAt: expiresAt ? new Date(expiresAt) : null,
          createdBy: createdById,
        })
        .returning();

      createdLinks.push(link);
    }

    return NextResponse.json({
      success: true,
      links: createdLinks,
      message: `Created ${count} access link(s)`,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.errors },
        { status: 400 }
      );
    }
    console.error("Error creating access link:", error);
    return NextResponse.json(
      { error: "Failed to create access link" },
      { status: 500 }
    );
  }
});

/**
 * Generate a unique access code
 * Format: XXXX-XXXX-XXXX (alphanumeric, uppercase)
 */
function generateAccessCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Removed similar looking characters
  let code = "";
  for (let i = 0; i < 12; i++) {
    if (i > 0 && i % 4 === 0) code += "-";
    code += chars[crypto.randomInt(chars.length)];
  }
  return code;
}
