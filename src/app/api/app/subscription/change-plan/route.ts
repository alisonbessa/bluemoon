import { NextResponse } from "next/server";
import withAuthRequired from "@/shared/lib/auth/withAuthRequired";
import { createLogger } from "@/shared/lib/logger";

const logger = createLogger("api:subscription:change-plan");
import stripe from "@/integrations/stripe";
import { db } from "@/db";
import { plans } from "@/db/schema/plans";
import { budgetMembers } from "@/db/schema";
import { eq, and, isNotNull } from "drizzle-orm";
import { z } from "zod";
import {
  validationError,
  errorResponse,
  successResponse,
} from "@/shared/lib/api/responses";

const changePlanSchema = z.object({
  newPlanCodename: z.enum(["solo", "duo"]),
});

/**
 * POST /api/app/subscription/change-plan
 *
 * Changes the user's subscription plan (Solo ↔ Duo).
 * - Validates user has active subscription
 * - If downgrading Duo → Solo, checks for connected partner
 * - Updates Stripe subscription with proration
 */
export const POST = withAuthRequired(async (req, { getUser, getCurrentPlan }) => {
  try {
    const body = await req.json();
    const validation = changePlanSchema.safeParse(body);

    if (!validation.success) {
      return validationError(validation.error);
    }

    const { newPlanCodename } = validation.data;
    const user = await getUser();
    const currentPlan = await getCurrentPlan();

    if (!user) {
      return errorResponse("Usuário não encontrado", 404);
    }

    // Check user has active subscription
    if (!user.stripeSubscriptionId) {
      return errorResponse(
        "Você não possui uma assinatura ativa. Assine um plano primeiro.",
        400
      );
    }

    // Check if trying to change to the same plan
    if (currentPlan?.codename === newPlanCodename) {
      return errorResponse(
        `Você já está no plano ${currentPlan.name}`,
        400
      );
    }

    // Get the new plan from database
    const [newPlan] = await db
      .select()
      .from(plans)
      .where(eq(plans.codename, newPlanCodename))
      .limit(1);

    if (!newPlan) {
      return errorResponse("Plano não encontrado", 404);
    }

    // Get current subscription from Stripe
    const subscription = await stripe.subscriptions.retrieve(
      user.stripeSubscriptionId
    );

    if (subscription.status === "canceled") {
      return errorResponse(
        "Sua assinatura foi cancelada. Assine novamente para mudar de plano.",
        400
      );
    }

    // Determine current billing period (monthly or yearly)
    const currentPriceId = subscription.items.data[0]?.price?.id;
    const currentPrice = currentPriceId
      ? await stripe.prices.retrieve(currentPriceId)
      : null;

    const isYearly = currentPrice?.recurring?.interval === "year";

    // Get the new price ID based on billing period
    const newPriceId = isYearly
      ? newPlan.yearlyStripePriceId
      : newPlan.monthlyStripePriceId;

    if (!newPriceId) {
      return errorResponse(
        "Preço não configurado para este plano. Contate o suporte.",
        500
      );
    }

    // If downgrading from Duo to Solo, check for connected partner
    if (currentPlan?.codename === "duo" && newPlanCodename === "solo") {
      // Get all budgets where user is owner
      const ownerBudgets = await db
        .select({ budgetId: budgetMembers.budgetId })
        .from(budgetMembers)
        .where(
          and(
            eq(budgetMembers.userId, user.id),
            eq(budgetMembers.type, "owner")
          )
        );

      // Check if any of these budgets has a connected partner
      for (const budget of ownerBudgets) {
        const [connectedPartner] = await db
          .select({ id: budgetMembers.id, name: budgetMembers.name })
          .from(budgetMembers)
          .where(
            and(
              eq(budgetMembers.budgetId, budget.budgetId),
              eq(budgetMembers.type, "partner"),
              isNotNull(budgetMembers.userId)
            )
          )
          .limit(1);

        if (connectedPartner) {
          return errorResponse(
            `Você tem um parceiro(a) conectado ao seu orçamento (${connectedPartner.name}). Remova-o nas configurações antes de fazer downgrade para o plano Solo.`,
            400
          );
        }
      }
    }

    // Update the Stripe subscription with the new price
    // This will prorate automatically
    await stripe.subscriptions.update(user.stripeSubscriptionId, {
      items: [
        {
          id: subscription.items.data[0].id,
          price: newPriceId,
        },
      ],
      proration_behavior: "create_prorations",
    });

    // Note: The plan update in our database will happen via webhook
    // when Stripe sends the customer.subscription.updated event

    return successResponse({
      success: true,
      message: `Plano alterado para ${newPlan.name}. A mudança entrará em vigor imediatamente.`,
      newPlan: {
        name: newPlan.name,
        codename: newPlan.codename,
      },
      proration: true,
    });
  } catch (error) {
    logger.error("Error changing plan:", error);

    if (error instanceof Error && error.message.includes("No such subscription")) {
      return errorResponse(
        "Assinatura não encontrada no Stripe. Contate o suporte.",
        400
      );
    }

    return errorResponse("Erro ao alterar plano. Tente novamente.", 500);
  }
});
