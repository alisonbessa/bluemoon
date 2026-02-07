import { NextResponse } from "next/server";
import { createLogger } from "@/shared/lib/logger";
import { db } from "@/db";

const logger = createLogger("api:plans");
import { plans } from "@/db/schema/plans";
import { inArray } from "drizzle-orm";

/**
 * GET /api/app/plans
 *
 * Returns available subscription plans (Solo and Duo)
 * with pricing information and quotas.
 */
export async function GET() {
  try {
    // Get Solo and Duo plans
    const availablePlans = await db
      .select({
        id: plans.id,
        name: plans.name,
        codename: plans.codename,
        hasMonthlyPricing: plans.hasMonthlyPricing,
        hasYearlyPricing: plans.hasYearlyPricing,
        monthlyPrice: plans.monthlyPrice,
        monthlyPriceAnchor: plans.monthlyPriceAnchor,
        yearlyPrice: plans.yearlyPrice,
        yearlyPriceAnchor: plans.yearlyPriceAnchor,
        quotas: plans.quotas,
      })
      .from(plans)
      .where(inArray(plans.codename, ["solo", "duo"]));

    // Format plans for frontend
    const formattedPlans = availablePlans.map((plan) => ({
      id: plan.id,
      name: plan.name,
      codename: plan.codename,
      pricing: {
        monthly: plan.hasMonthlyPricing
          ? {
              price: plan.monthlyPrice,
              priceAnchor: plan.monthlyPriceAnchor,
              priceFormatted: plan.monthlyPrice
                ? formatPrice(plan.monthlyPrice)
                : null,
            }
          : null,
        yearly: plan.hasYearlyPricing
          ? {
              price: plan.yearlyPrice,
              priceAnchor: plan.yearlyPriceAnchor,
              priceFormatted: plan.yearlyPrice
                ? formatPrice(plan.yearlyPrice)
                : null,
              monthlyEquivalent: plan.yearlyPrice
                ? formatPrice(Math.round(plan.yearlyPrice / 12))
                : null,
            }
          : null,
      },
      quotas: plan.quotas,
      features: getPlanFeatures(plan.codename),
    }));

    return NextResponse.json({
      plans: formattedPlans,
      trialDays: 30,
    });
  } catch (error) {
    logger.error("Error fetching plans:", error);
    return NextResponse.json(
      { error: "Failed to fetch plans" },
      { status: 500 }
    );
  }
}

/**
 * Format price in cents to BRL string
 */
function formatPrice(cents: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);
}

/**
 * Get features for a plan
 */
function getPlanFeatures(codename: string | null): string[] {
  const baseFeatures = [
    "Orçamento mensal completo",
    "Controle de contas e cartões",
    "Categorias personalizáveis",
    "Metas de economia",
    "Relatórios e gráficos",
    "Sincronização em tempo real",
    "Suporte por email",
  ];

  if (codename === "solo") {
    return [
      "1 pessoa no orçamento",
      ...baseFeatures,
    ];
  }

  if (codename === "duo") {
    return [
      "2 pessoas no orçamento",
      "Convide seu parceiro(a)",
      ...baseFeatures,
      "Suporte prioritário",
    ];
  }

  return baseFeatures;
}
