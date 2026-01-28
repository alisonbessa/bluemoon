import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { accessLinks } from "@/db/schema";
import { eq, and, or, isNull, gt } from "drizzle-orm";

/**
 * Public API to validate an access link code
 * Used by the /redeem/[code] page before user selects a plan
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;

    // Normalize code: uppercase only (codes are stored with dashes)
    const normalizedCode = code.toUpperCase().trim();

    console.log("[access-link] Searching for code:", normalizedCode);

    // First, check if link exists at all (without filters)
    const [anyLink] = await db
      .select()
      .from(accessLinks)
      .where(eq(accessLinks.code, normalizedCode))
      .limit(1);

    console.log("[access-link] Found link (no filters):", anyLink ? {
      id: anyLink.id,
      code: anyLink.code,
      expired: anyLink.expired,
      usedAt: anyLink.usedAt,
      expiresAt: anyLink.expiresAt,
    } : null);

    // Find the access link with all filters
    const [link] = await db
      .select()
      .from(accessLinks)
      .where(
        and(
          eq(accessLinks.code, normalizedCode),
          eq(accessLinks.expired, false),
          isNull(accessLinks.usedAt),
          or(
            isNull(accessLinks.expiresAt),
            gt(accessLinks.expiresAt, new Date())
          )
        )
      )
      .limit(1);

    console.log("[access-link] Found link (with filters):", link ? "valid" : "not found");

    if (!link) {
      // Provide more specific error message
      if (anyLink) {
        if (anyLink.usedAt) {
          console.log("[access-link] Link already used");
          return NextResponse.json(
            { error: "Este código já foi utilizado" },
            { status: 404 }
          );
        }
        if (anyLink.expired) {
          console.log("[access-link] Link expired (manual)");
          return NextResponse.json(
            { error: "Este código foi expirado" },
            { status: 404 }
          );
        }
        if (anyLink.expiresAt && anyLink.expiresAt < new Date()) {
          console.log("[access-link] Link expired (date)");
          return NextResponse.json(
            { error: "Este código expirou" },
            { status: 404 }
          );
        }
      }
      console.log("[access-link] Link not found");
      return NextResponse.json(
        { error: "Código inválido" },
        { status: 404 }
      );
    }

    // Return only safe public info
    return NextResponse.json({
      valid: true,
      type: link.type,
    });
  } catch (error) {
    console.error("Error validating access link:", error);
    return NextResponse.json(
      { error: "Erro ao validar código" },
      { status: 500 }
    );
  }
}
