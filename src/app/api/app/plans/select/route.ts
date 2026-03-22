import { NextResponse } from "next/server";
import withAuthRequired from "@/shared/lib/auth/withAuthRequired";
import { db } from "@/db";
import { plans } from "@/db/schema/plans";
import { users } from "@/db/schema/user";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { createLogger } from "@/shared/lib/logger";

const logger = createLogger("api:plans:select");

const selectPlanSchema = z.object({
  codename: z.enum(["solo", "duo"]),
});

/**
 * POST /api/app/plans/select
 *
 * Allows beta users to choose a plan (Solo/Duo) without Stripe.
 * Sets the user's planId to the chosen plan.
 */
export const POST = withAuthRequired(async (req, { session, getUser }) => {
  try {
    const user = await getUser();

    if (user.role !== "beta") {
      return NextResponse.json(
        { error: "Apenas beta testers podem selecionar plano desta forma" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { codename } = selectPlanSchema.parse(body);

    const [plan] = await db
      .select()
      .from(plans)
      .where(eq(plans.codename, codename))
      .limit(1);

    if (!plan) {
      return NextResponse.json(
        { error: "Plano não encontrado" },
        { status: 404 }
      );
    }

    await db
      .update(users)
      .set({ planId: plan.id })
      .where(eq(users.id, session.user.id));

    logger.info(`Beta user ${session.user.email} selected plan: ${codename}`);

    return NextResponse.json({ success: true, planId: plan.id });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    logger.error("Error selecting plan", error);
    return NextResponse.json(
      { error: "Erro ao selecionar plano" },
      { status: 500 }
    );
  }
});
