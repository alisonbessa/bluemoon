import postgres from "postgres";
import * as dotenv from "dotenv";
import * as path from "path";
import Stripe from "stripe";

// Load .env.local
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const DATABASE_URL = process.env.DATABASE_URL;
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const TRIAL_DAYS = parseInt(process.env.STRIPE_TRIAL_DAYS || "30");

if (!DATABASE_URL) {
  console.error("❌ DATABASE_URL not found in .env.local");
  process.exit(1);
}

const stripe = STRIPE_SECRET_KEY ? new Stripe(STRIPE_SECRET_KEY) : null;

interface PlanData {
  name: string;
  codename: string;
  description: string;
  monthlyPrice: number; // in cents
  yearlyPrice: number; // in cents
  maxBudgetMembers: number;
}

const plansToCreate: PlanData[] = [
  {
    name: "Solo",
    codename: "solo",
    description: "Plano individual para gerenciar suas finanças",
    monthlyPrice: 1490, // R$ 14,90
    yearlyPrice: 13990, // R$ 139,90
    maxBudgetMembers: 1,
  },
  {
    name: "Duo",
    codename: "duo",
    description: "Plano compartilhado para casais ou parceiros",
    monthlyPrice: 1990, // R$ 19,90
    yearlyPrice: 18990, // R$ 189,90
    maxBudgetMembers: 2,
  },
];

async function createStripeProduct(plan: PlanData) {
  if (!stripe) return null;

  console.log(`  📦 Creating Stripe product for ${plan.name}...`);

  // Check if product already exists by listing all products and filtering
  // (Search API not available in all regions)
  const allProducts = await stripe.products.list({ limit: 100, active: true });
  const existingProduct = allProducts.data.find(
    (p) => p.metadata?.plan_codename === plan.codename
  );

  let product: Stripe.Product;
  if (existingProduct) {
    product = existingProduct;
    console.log(`  ⚡ Product already exists: ${product.id}`);
  } else {
    product = await stripe.products.create({
      name: plan.name,
      description: plan.description,
      metadata: {
        plan_codename: plan.codename,
      },
    });
    console.log(`  ✅ Product created: ${product.id}`);
  }

  return product;
}

async function createStripePrice(
  productId: string,
  amount: number,
  interval: "month" | "year",
  planCodename: string
) {
  if (!stripe) return null;

  const intervalLabel = interval === "month" ? "monthly" : "yearly";
  console.log(`  💵 Creating ${intervalLabel} price...`);

  // Check if price already exists with same amount
  const existingPrices = await stripe.prices.list({
    product: productId,
    active: true,
  });

  const existingPrice = existingPrices.data.find(
    (p) =>
      p.unit_amount === amount &&
      p.recurring?.interval === interval &&
      p.currency === "brl"
  );

  if (existingPrice) {
    console.log(`  ⚡ Price already exists: ${existingPrice.id}`);
    return existingPrice;
  }

  const price = await stripe.prices.create({
    product: productId,
    currency: "brl",
    unit_amount: amount,
    recurring: {
      interval,
      trial_period_days: TRIAL_DAYS,
    },
    metadata: {
      plan_codename: planCodename,
      interval: intervalLabel,
    },
  });

  console.log(`  ✅ Price created: ${price.id}`);
  return price;
}

async function seedPlans() {
  console.log("🌱 Starting plans seed...\n");

  const client = postgres(DATABASE_URL as string);

  try {
    for (const plan of plansToCreate) {
      console.log(`\n📋 Processing plan: ${plan.name}`);
      console.log("─".repeat(40));

      // Check if plan already exists
      const existingPlan = await client`
        SELECT id FROM plans WHERE codename = ${plan.codename}
      `;

      let planId: string;
      let monthlyStripePriceId: string | null = null;
      let yearlyStripePriceId: string | null = null;

      // Create Stripe product and prices if API key is available
      if (stripe) {
        const product = await createStripeProduct(plan);
        if (product) {
          const monthlyPrice = await createStripePrice(
            product.id,
            plan.monthlyPrice,
            "month",
            plan.codename
          );
          const yearlyPrice = await createStripePrice(
            product.id,
            plan.yearlyPrice,
            "year",
            plan.codename
          );

          monthlyStripePriceId = monthlyPrice?.id || null;
          yearlyStripePriceId = yearlyPrice?.id || null;
        }
      } else {
        console.log("  ⚠️  STRIPE_SECRET_KEY not configured, skipping Stripe sync");
      }

      if (existingPlan.length > 0) {
        // Update existing plan
        planId = existingPlan[0].id;
        console.log(`  📝 Updating existing plan: ${planId}`);

        await client`
          UPDATE plans SET
            name = ${plan.name},
            "hasMonthlyPricing" = true,
            "hasYearlyPricing" = true,
            "monthlyPrice" = ${plan.monthlyPrice},
            "yearlyPrice" = ${plan.yearlyPrice},
            "monthlyStripePriceId" = COALESCE(${monthlyStripePriceId}, "monthlyStripePriceId"),
            "yearlyStripePriceId" = COALESCE(${yearlyStripePriceId}, "yearlyStripePriceId"),
            quotas = ${JSON.stringify({
              maxBudgetMembers: plan.maxBudgetMembers,
              premiumSupport: false,
              monthlyImages: 10,
            })}
          WHERE codename = ${plan.codename}
        `;
        console.log(`  ✅ Plan updated in database`);
      } else {
        // Create new plan
        planId = crypto.randomUUID();
        console.log(`  📝 Creating new plan: ${planId}`);

        await client`
          INSERT INTO plans (
            id,
            name,
            codename,
            "default",
            "hasMonthlyPricing",
            "hasYearlyPricing",
            "monthlyPrice",
            "yearlyPrice",
            "monthlyStripePriceId",
            "yearlyStripePriceId",
            quotas
          ) VALUES (
            ${planId},
            ${plan.name},
            ${plan.codename},
            false,
            true,
            true,
            ${plan.monthlyPrice},
            ${plan.yearlyPrice},
            ${monthlyStripePriceId},
            ${yearlyStripePriceId},
            ${JSON.stringify({
              maxBudgetMembers: plan.maxBudgetMembers,
              premiumSupport: false,
              monthlyImages: 10,
            })}
          )
        `;
        console.log(`  ✅ Plan created in database`);
      }

      // Summary for this plan
      console.log(`\n  📊 Summary for ${plan.name}:`);
      console.log(`     Monthly: R$ ${(plan.monthlyPrice / 100).toFixed(2)}/mês`);
      console.log(`     Yearly: R$ ${(plan.yearlyPrice / 100).toFixed(2)}/ano`);
      console.log(`     Max members: ${plan.maxBudgetMembers}`);
      if (monthlyStripePriceId) {
        console.log(`     Stripe Monthly: ${monthlyStripePriceId}`);
      }
      if (yearlyStripePriceId) {
        console.log(`     Stripe Yearly: ${yearlyStripePriceId}`);
      }
    }

    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("✨ Plans seed complete!");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    if (!stripe) {
      console.log("⚠️  Note: Stripe products/prices were NOT created.");
      console.log("   Add STRIPE_SECRET_KEY to .env.local and run again,");
      console.log("   or use the Super Admin panel to sync manually.\n");
    } else {
      console.log("✅ Stripe products and prices created with 30-day trial.\n");
    }

    console.log("Next steps:");
    console.log("  1. Verify plans at /super-admin/plans");
    console.log("  2. Check Stripe Dashboard: https://dashboard.stripe.com/products");
    console.log("  3. Configure webhooks if not done yet\n");
  } catch (error) {
    console.error("\n❌ Error seeding plans:");
    console.error(error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

seedPlans();
