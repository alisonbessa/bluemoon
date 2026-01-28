import { NextResponse } from "next/server";
import withAuthRequired from "@/shared/lib/auth/withAuthRequired";
import { db } from "@/db";
import { accessLinks, accessLinkPlanTypeEnum } from "@/db/schema/access-links";
import { users } from "@/db/schema/user";
import { plans } from "@/db/schema/plans";
import { eq, and, isNull } from "drizzle-orm";
import { z } from "zod";

const redeemSchema = z.object({
  code: z.string().min(1),
  planType: accessLinkPlanTypeEnum,
});

/**
 * POST /api/app/redeem-access-link
 *
 * Redeem an access link for lifetime/beta access
 */
export const POST = withAuthRequired(async (req, { session }) => {
  try {
    console.log("[redeem-access-link] Starting redemption");
    console.log("[redeem-access-link] Session:", JSON.stringify(session, null, 2));

    const body = await req.json();
    console.log("[redeem-access-link] Body:", body);

    const { code, planType } = redeemSchema.parse(body);
    console.log("[redeem-access-link] Parsed - code:", code, "planType:", planType);

    // Normalize code (uppercase, remove extra spaces)
    const normalizedCode = code.toUpperCase().trim();

    // Find the access link
    const [link] = await db
      .select()
      .from(accessLinks)
      .where(
        and(
          eq(accessLinks.code, normalizedCode),
          isNull(accessLinks.usedAt),
          eq(accessLinks.expired, false)
        )
      )
      .limit(1);

    console.log("[redeem-access-link] Link found:", link ? { id: link.id, code: link.code, type: link.type } : null);

    if (!link) {
      return NextResponse.json(
        { error: "Código inválido ou já utilizado" },
        { status: 400 }
      );
    }

    // Check if link has expired by date
    if (link.expiresAt && new Date() > link.expiresAt) {
      return NextResponse.json(
        { error: "Este código expirou" },
        { status: 400 }
      );
    }

    // Find the appropriate plan based on planType
    const planCodename = planType; // "solo" or "duo"
    const [plan] = await db
      .select()
      .from(plans)
      .where(eq(plans.codename, planCodename))
      .limit(1);

    console.log("[redeem-access-link] Plan found:", plan ? { id: plan.id, name: plan.name, codename: plan.codename } : null);

    if (!plan) {
      return NextResponse.json(
        { error: "Plano não encontrado" },
        { status: 400 }
      );
    }

    // Determine user role based on link type
    const newRole = link.type === "lifetime" ? "lifetime" : "beta";
    console.log("[redeem-access-link] New role:", newRole);

    // Get the user ID from session
    const userId = session.user?.id;
    console.log("[redeem-access-link] User ID from session:", userId);

    if (!userId) {
      console.error("[redeem-access-link] No user ID in session!");
      return NextResponse.json(
        { error: "Usuário não identificado na sessão" },
        { status: 401 }
      );
    }

    // Update the access link as used
    console.log("[redeem-access-link] Updating access link...");
    await db
      .update(accessLinks)
      .set({
        userId: userId,
        usedAt: new Date(),
        planType,
      })
      .where(eq(accessLinks.id, link.id));
    console.log("[redeem-access-link] Access link updated!");

    // Update the user with the new plan and role
    console.log("[redeem-access-link] Updating user...");
    await db
      .update(users)
      .set({
        planId: plan.id,
        role: newRole,
        accessLinkId: link.id,
        trialEndsAt: null, // Clear any trial period
      })
      .where(eq(users.id, userId));
    console.log("[redeem-access-link] User updated!");

    return NextResponse.json({
      success: true,
      message: `Acesso ${link.type === "lifetime" ? "vitalício" : "beta"} ativado com sucesso!`,
      plan: {
        id: plan.id,
        name: plan.name,
        codename: plan.codename,
      },
      role: newRole,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error("[redeem-access-link] Zod validation error:", error.errors);
      return NextResponse.json(
        { error: "Dados inválidos", details: error.errors },
        { status: 400 }
      );
    }
    console.error("[redeem-access-link] Error:", error);
    console.error("[redeem-access-link] Error message:", error instanceof Error ? error.message : "Unknown error");
    console.error("[redeem-access-link] Error stack:", error instanceof Error ? error.stack : "No stack");
    return NextResponse.json(
      { error: "Falha ao resgatar código" },
      { status: 500 }
    );
  }
});
