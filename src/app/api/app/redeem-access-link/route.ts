import { NextResponse } from "next/server";
import withAuthRequired from "@/shared/lib/auth/withAuthRequired";
import { db } from "@/db";
import { accessLinks, accessLinkPlanTypeEnum } from "@/db/schema/access-links";
import { users } from "@/db/schema/user";
import { plans } from "@/db/schema/plans";
import { eq, and, isNull } from "drizzle-orm";
import { z } from "zod";
import { createLogger } from "@/shared/lib/logger";

const logger = createLogger("api:redeem-access-link");

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
    logger.info("Starting redemption");

    const body = await req.json();
    const { code, planType } = redeemSchema.parse(body);
    logger.info("Parsed redemption request", { code, planType });

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

    logger.info("Link lookup result", { found: !!link, id: link?.id });

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

    logger.info("Plan lookup result", { found: !!plan, codename: plan?.codename });

    if (!plan) {
      return NextResponse.json(
        { error: "Plano não encontrado" },
        { status: 400 }
      );
    }

    // Determine user role based on link type
    const newRole = link.type === "lifetime" ? "lifetime" : "beta";
    logger.info("Determined new role", { newRole });

    // Get the user ID from session
    const userId = session.user?.id;

    if (!userId) {
      logger.error("No user ID in session");
      return NextResponse.json(
        { error: "Usuário não identificado na sessão" },
        { status: 401 }
      );
    }

    // Update the access link as used
    await db
      .update(accessLinks)
      .set({
        userId: userId,
        usedAt: new Date(),
        planType,
      })
      .where(eq(accessLinks.id, link.id));
    logger.info("Access link updated");

    // Update the user with the new plan and role
    await db
      .update(users)
      .set({
        planId: plan.id,
        role: newRole,
        accessLinkId: link.id,
        trialEndsAt: null, // Clear any trial period
      })
      .where(eq(users.id, userId));
    logger.info("User updated", { userId, newRole, planId: plan.id });

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
      logger.error("Zod validation error", error);
      return NextResponse.json(
        { error: "Dados inválidos", details: error.errors },
        { status: 400 }
      );
    }
    logger.error("Error redeeming access link", error);
    return NextResponse.json(
      { error: "Falha ao resgatar código" },
      { status: 500 }
    );
  }
});
