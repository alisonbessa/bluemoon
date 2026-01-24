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

    // Normalize code: uppercase and remove dashes for lookup
    const normalizedCode = code.toUpperCase().replace(/-/g, "");

    // Find the access link
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

    if (!link) {
      return NextResponse.json(
        { error: "Código inválido ou já utilizado" },
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
