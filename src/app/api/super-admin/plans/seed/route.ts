import { NextResponse } from "next/server";
import withSuperAdminAuthRequired from "@/shared/lib/auth/withSuperAdminAuthRequired";
import { db } from "@/db";
import { plans } from "@/db/schema/plans";
import { eq } from "drizzle-orm";

// Default plans configuration for HiveBudget
const DEFAULT_PLANS = [
  {
    name: "Solo",
    codename: "solo",
    default: false,
    hasMonthlyPricing: true,
    hasYearlyPricing: true,
    hasOnetimePricing: false,
    monthlyPrice: 1490, // R$ 14,90 in centavos
    yearlyPrice: 13990, // R$ 139,90 in centavos
    quotas: {
      maxBudgetMembers: 1,
      premiumSupport: false,
      monthlyImages: 10,
    },
  },
  {
    name: "Duo",
    codename: "duo",
    default: false,
    hasMonthlyPricing: true,
    hasYearlyPricing: true,
    hasOnetimePricing: false,
    monthlyPrice: 1990, // R$ 19,90 in centavos
    yearlyPrice: 18990, // R$ 189,90 in centavos
    quotas: {
      maxBudgetMembers: 2,
      premiumSupport: false,
      monthlyImages: 10,
    },
  },
  {
    name: "Free",
    codename: "free",
    default: true, // This is the default plan for new users
    hasMonthlyPricing: false,
    hasYearlyPricing: false,
    hasOnetimePricing: false,
    monthlyPrice: 0,
    yearlyPrice: 0,
    quotas: {
      maxBudgetMembers: 1,
      premiumSupport: false,
      monthlyImages: 0,
    },
  },
];

export const POST = withSuperAdminAuthRequired(async () => {
  try {
    const results = {
      created: [] as string[],
      skipped: [] as string[],
      errors: [] as string[],
    };

    for (const planData of DEFAULT_PLANS) {
      // Check if plan already exists by codename
      const existingPlan = await db
        .select()
        .from(plans)
        .where(eq(plans.codename, planData.codename))
        .limit(1);

      if (existingPlan.length > 0) {
        results.skipped.push(planData.codename);
        continue;
      }

      try {
        await db.insert(plans).values(planData);
        results.created.push(planData.codename);
      } catch (error) {
        console.error(`Error creating plan ${planData.codename}:`, error);
        results.errors.push(planData.codename);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Created ${results.created.length} plans, skipped ${results.skipped.length} existing plans`,
      results,
    });
  } catch (error) {
    console.error("Error seeding plans:", error);
    return NextResponse.json(
      { error: "Failed to seed plans" },
      { status: 500 }
    );
  }
});
