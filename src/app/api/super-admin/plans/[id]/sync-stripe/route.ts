import { NextResponse } from "next/server";
import withSuperAdminAuthRequired from "@/shared/lib/auth/withSuperAdminAuthRequired";
import { createLogger } from "@/shared/lib/logger";
import { db } from "@/db";

const logger = createLogger("api:admin:plans:sync-stripe");
import { plans } from "@/db/schema/plans";
import { eq } from "drizzle-orm";
import { stripe } from "@/integrations/stripe/client";

const TRIAL_DAYS = parseInt(process.env.STRIPE_TRIAL_DAYS || "30");

interface SyncResult {
  success: boolean;
  productId?: string;
  monthlyPriceId?: string;
  yearlyPriceId?: string;
  onetimePriceId?: string;
  error?: string;
}

export const POST = withSuperAdminAuthRequired(
  async (req, { params }) => {
    try {
      const { id } = (await params) as { id: string };

      // Fetch the plan from database
      const [plan] = await db
        .select()
        .from(plans)
        .where(eq(plans.id, id))
        .limit(1);

      if (!plan) {
        return NextResponse.json({ error: "Plan not found" }, { status: 404 });
      }

      if (!plan.name || !plan.codename) {
        return NextResponse.json(
          { error: "Plan must have a name and codename" },
          { status: 400 }
        );
      }

      const result: SyncResult = { success: false };

      // Check if product already exists by listing and filtering
      // (Search API not available in all regions)
      let product: Awaited<ReturnType<typeof stripe.products.retrieve>> | null = null;

      const allProducts = await stripe.products.list({ limit: 100, active: true });
      const existingProduct = allProducts.data.find(
        (p) => p.metadata?.plan_codename === plan.codename
      );

      if (existingProduct) {
        // Update existing product
        product = await stripe.products.update(existingProduct.id, {
          name: plan.name,
          description: getProductDescription(plan.codename),
        });
      } else {
        // Create new product
        product = await stripe.products.create({
          name: plan.name,
          description: getProductDescription(plan.codename),
          metadata: {
            plan_id: plan.id,
            plan_codename: plan.codename,
          },
        });
      }

      result.productId = product.id;

      // Create or update prices
      const updates: Partial<typeof plans.$inferInsert> = {};

      // Monthly price
      if (plan.hasMonthlyPricing && plan.monthlyPrice && plan.monthlyPrice > 0) {
        const monthlyPrice = await createOrUpdatePrice({
          product: product.id,
          amount: plan.monthlyPrice,
          interval: "month",
          planId: plan.id,
          existingPriceId: plan.monthlyStripePriceId,
        });
        result.monthlyPriceId = monthlyPrice.id;
        updates.monthlyStripePriceId = monthlyPrice.id;
      }

      // Yearly price
      if (plan.hasYearlyPricing && plan.yearlyPrice && plan.yearlyPrice > 0) {
        const yearlyPrice = await createOrUpdatePrice({
          product: product.id,
          amount: plan.yearlyPrice,
          interval: "year",
          planId: plan.id,
          existingPriceId: plan.yearlyStripePriceId,
        });
        result.yearlyPriceId = yearlyPrice.id;
        updates.yearlyStripePriceId = yearlyPrice.id;
      }

      // One-time price
      if (plan.hasOnetimePricing && plan.onetimePrice && plan.onetimePrice > 0) {
        const onetimePrice = await createOnetimePrice({
          product: product.id,
          amount: plan.onetimePrice,
          planId: plan.id,
          existingPriceId: plan.onetimeStripePriceId,
        });
        result.onetimePriceId = onetimePrice.id;
        updates.onetimeStripePriceId = onetimePrice.id;
      }

      // Update database with new price IDs
      if (Object.keys(updates).length > 0) {
        await db.update(plans).set(updates).where(eq(plans.id, id));
      }

      result.success = true;
      return NextResponse.json(result);
    } catch (error) {
      logger.error("Error syncing plan to Stripe:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      return NextResponse.json(
        { error: `Failed to sync plan to Stripe: ${errorMessage}` },
        { status: 500 }
      );
    }
  }
);

function getProductDescription(codename: string): string {
  const descriptions: Record<string, string> = {
    solo: "Plano individual para gerenciar suas finanças",
    duo: "Plano compartilhado para casais ou parceiros",
  };
  return descriptions[codename] || `Plano ${codename}`;
}

async function createOrUpdatePrice({
  product,
  amount,
  interval,
  planId,
  existingPriceId,
}: {
  product: string;
  amount: number;
  interval: "month" | "year";
  planId: string;
  existingPriceId: string | null;
}) {
  // Check if existing price is still valid
  if (existingPriceId) {
    try {
      const existingPrice = await stripe.prices.retrieve(existingPriceId);

      // If price matches, return it
      if (
        existingPrice.unit_amount === amount &&
        existingPrice.recurring?.interval === interval &&
        existingPrice.active
      ) {
        return existingPrice;
      }

      // Archive old price if it exists and is different
      await stripe.prices.update(existingPriceId, { active: false });
    } catch {
      // Price doesn't exist, continue to create new one
    }
  }

  // Create new price with trial settings
  return stripe.prices.create({
    product,
    currency: "brl",
    unit_amount: amount,
    recurring: {
      interval,
      trial_period_days: TRIAL_DAYS,
    },
    metadata: {
      plan_id: planId,
      interval,
    },
  });
}

async function createOnetimePrice({
  product,
  amount,
  planId,
  existingPriceId,
}: {
  product: string;
  amount: number;
  planId: string;
  existingPriceId: string | null;
}) {
  // Check if existing price is still valid
  if (existingPriceId) {
    try {
      const existingPrice = await stripe.prices.retrieve(existingPriceId);

      // If price matches, return it
      if (existingPrice.unit_amount === amount && existingPrice.active) {
        return existingPrice;
      }

      // Archive old price if it exists and is different
      await stripe.prices.update(existingPriceId, { active: false });
    } catch {
      // Price doesn't exist, continue to create new one
    }
  }

  // Create new one-time price
  return stripe.prices.create({
    product,
    currency: "brl",
    unit_amount: amount,
    metadata: {
      plan_id: planId,
      type: "onetime",
    },
  });
}
