import Stripe from "stripe";
import { users } from "@/db/schema/user";
import { db } from "@/db";
import { eq } from "drizzle-orm";
import getOrCreateUser from "@/shared/lib/users/getOrCreateUser";
import updatePlan from "@/shared/lib/plans/updatePlan";
import downgradeToDefaultPlan from "@/shared/lib/plans/downgradeToDefaultPlan";
import { allocatePlanCredits } from "@/shared/lib/credits/allocatePlanCredits";
import { getPlanFromStripePriceId, getStripeCustomer, APIError, logger } from "./helpers";

export async function onSubscriptionCreated(data: Stripe.Event.Data) {
  const object: Stripe.Subscription = data.object;
  logger.info("onSubscriptionCreated", { subscriptionId: object.id });

  const price = object.items.data[0].price;

  if (!price) {
    logger.error("No price found in subscription");
    throw new APIError("No price found in subscription");
  }
  logger.info("Price found", { priceId: price.id });

  const customer = await getStripeCustomer(object.customer);
  if (!customer || !customer.email) {
    logger.error("No customer found in subscription");
    throw new APIError("No customer found in subscription");
  }
  logger.info("Customer found", { customerEmail: customer.email });

  const { user } = await getOrCreateUser({
    emailId: customer.email,
    name: customer.name,
  });
  logger.info("User resolved", { userId: user.id });

  const dbPlan = await getPlanFromStripePriceId(price.id);
  logger.info("Plan lookup result", { planName: dbPlan ? dbPlan.name : "NOT FOUND" });

  if (!dbPlan) {
    // TIP: Handle outside plan management subscription
    logger.error("Plan not found for price ID", { priceId: price.id });
    throw new APIError("Plan not found");
  }

  // Prepare update data
  const updateData: { stripeSubscriptionId: string; trialEndsAt?: Date | null } = {
    stripeSubscriptionId: object.id,
  };

  // If subscription is in trial, set trialEndsAt
  if (object.status === "trialing" && object.trial_end) {
    updateData.trialEndsAt = new Date(object.trial_end * 1000);
  }

  await db
    .update(users)
    .set(updateData)
    .where(eq(users.id, user.id));
  logger.info("Updated user subscription", { userId: user.id, stripeSubscriptionId: object.id });

  await updatePlan({ userId: user.id, newPlanId: dbPlan.id });
  logger.info("Updated user plan", { planName: dbPlan.name });

  // Allocate plan-based credits
  await allocatePlanCredits({
    userId: user.id,
    planId: dbPlan.id,
    paymentId: object.id,
    paymentMetadata: {
      source: "stripe_subscription_created",
      subscriptionId: object.id,
      customerId: customer.id,
    }
  });
  logger.info("onSubscriptionCreated completed successfully");
}

export async function onSubscriptionUpdated(data: Stripe.Event.Data) {
  const object: Stripe.Subscription = data.object;

  const user = await db
    .select()
    .from(users)
    .where(eq(users.stripeSubscriptionId, object.id))
    .limit(1);
  if (!user?.[0]) {
    // Subscription is not for this user, skip
    return;
  }

  const price = object.items.data[0].price;
  if (!price) {
    throw new APIError("No price found in subscription");
  }

  const isActive = object.status === "active" || object.status === "trialing";

  if (!isActive) {
    // Subscription is cancelled, downgrade to free plan and clear trial
    await db
      .update(users)
      .set({ trialEndsAt: null })
      .where(eq(users.id, user[0].id));
    await downgradeToDefaultPlan({ userId: user[0].id });
    return;
  }

  // Update trialEndsAt based on current subscription status
  const trialUpdate: { trialEndsAt: Date | null } = {
    trialEndsAt: object.status === "trialing" && object.trial_end
      ? new Date(object.trial_end * 1000)
      : null, // Clear trial end if subscription is no longer in trial
  };

  await db
    .update(users)
    .set(trialUpdate)
    .where(eq(users.id, user[0].id));

  const dbPlan = await getPlanFromStripePriceId(price.id);
  if (!dbPlan) {
    // TIP: Handle outside plan management subscription
    return;
  }

  await updatePlan({ userId: user[0].id, newPlanId: dbPlan.id });

  // Allocate plan-based credits
  await allocatePlanCredits({
    userId: user[0].id,
    planId: dbPlan.id,
    paymentId: object.id,
    paymentMetadata: {
      source: "stripe_subscription_updated",
      subscriptionId: object.id,
      status: object.status,
    }
  });
}

export async function onSubscriptionDeleted(data: Stripe.Event.Data) {
  const object: Stripe.Subscription = data.object;

  const user = await db
    .select()
    .from(users)
    .where(eq(users.stripeSubscriptionId, object.id))
    .limit(1);
  if (!user?.[0]) {
    // Subscription is not for this user, skip
    return;
  }
  await downgradeToDefaultPlan({ userId: user[0].id });
}

/**
 * Handles the trial_will_end event - fired 3 days before trial ends
 * This is useful for sending reminder emails to users
 */
export async function onSubscriptionTrialWillEnd(data: Stripe.Event.Data) {
  const object: Stripe.Subscription = data.object;

  const user = await db
    .select()
    .from(users)
    .where(eq(users.stripeSubscriptionId, object.id))
    .limit(1);

  if (!user?.[0]) {
    // Subscription is not for any user we know, skip
    return;
  }

  // Update trialEndsAt in case it changed
  if (object.trial_end) {
    await db
      .update(users)
      .set({ trialEndsAt: new Date(object.trial_end * 1000) })
      .where(eq(users.id, user[0].id));
  }

  // Note: Email notifications are handled by Inngest scheduled jobs
  // that check trialEndsAt for D-7 and D-2 reminders
}
