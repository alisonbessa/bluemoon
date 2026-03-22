import Stripe from "stripe";
import stripe from "@/integrations/stripe";
import { plans } from "@/db/schema/plans";
import { db } from "@/db";
import { eq, or } from "drizzle-orm";
import { createLogger } from "@/shared/lib/logger";

export { default as APIError } from "@/shared/lib/api/errors";

export const logger = createLogger("stripe-webhook");

export async function getPlanFromStripePriceId(priceId: string) {
  const plan = await db
    .select()
    .from(plans)
    .where(
      or(
        eq(plans.monthlyStripePriceId, priceId),
        eq(plans.yearlyStripePriceId, priceId),
        eq(plans.onetimeStripePriceId, priceId)
      )
    )
    .limit(1);

  if (plan.length === 0) {
    return null;
  }

  return plan[0];
}

export async function getStripeCustomer(
  customer: string | Stripe.Customer | Stripe.DeletedCustomer
): Promise<Stripe.Customer | null> {
  if (typeof customer === "string") {
    const response = await stripe.customers.retrieve(customer);
    if (response.deleted) {
      return null;
    }
    return response;
  }
  if (customer.deleted) {
    return null;
  }
  return customer;
}
