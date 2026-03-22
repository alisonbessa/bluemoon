import Stripe from "stripe";
import stripe from "@/integrations/stripe";
import { users } from "@/db/schema/user";
import { db } from "@/db";
import { eq } from "drizzle-orm";
import getOrCreateUser from "@/shared/lib/users/getOrCreateUser";
import updatePlan from "@/shared/lib/plans/updatePlan";
import { addCredits } from "@/shared/lib/credits/recalculate";
import { type CreditType } from "@/shared/lib/credits/credits";
import { creditTypeSchema } from "@/shared/lib/credits/config";
import { allocatePlanCredits } from "@/shared/lib/credits/allocatePlanCredits";
import { getPlanFromStripePriceId, getStripeCustomer, APIError } from "./helpers";

async function handleOutsidePlanManagementProductInvoicePaid() {
  // Handle non-plan products here (e.g., credits, one-time purchases)
}

/**
 * Handles credits purchase from checkout session
 * @param checkoutSession - Stripe checkout session
 * @param user - User object
 */
export async function handleCreditsPurchase(checkoutSession: Stripe.Checkout.Session, user: { id: string; email: string }) {
  const metadata = checkoutSession.metadata;

  if (!metadata || metadata.type !== "credits_purchase") {
    return false; // Not a credits purchase
  }

  const { creditType, amount, userId } = metadata;

  // Validate metadata
  if (!creditType || !amount || !userId) {
    throw new APIError("Invalid credits purchase metadata");
  }

  if (userId !== user.id) {
    throw new APIError("User ID mismatch in credits purchase");
  }

  // Validate credit type
  const parsedCreditType = creditTypeSchema.safeParse(creditType);
  if (!parsedCreditType.success) {
    throw new APIError(`Invalid credit type: ${creditType}`);
  }

  const creditAmount = parseInt(amount);
  if (isNaN(creditAmount) || creditAmount <= 0) {
    throw new APIError(`Invalid credit amount: ${amount}`);
  }

  try {
    // Use checkout session ID as payment ID for idempotency
    const paymentId = checkoutSession.id;

    // Add credits with idempotency protection
    await addCredits(
      user.id,
      parsedCreditType.data as CreditType,
      creditAmount,
      paymentId,
      {
        reason: "Purchase via Stripe",
        checkoutSessionId: checkoutSession.id,
        paymentIntentId: checkoutSession.payment_intent,
        amountPaid: checkoutSession.amount_total,
        currency: checkoutSession.currency,
      }
    );

    return true; // Credits purchase handled
  } catch (error) {
    // If it's a duplicate payment error, that's okay - idempotency working
    if (error instanceof Error && error.message.includes("already exists")) {
      return true;
    }
    throw new APIError(`Failed to add credits: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function onInvoicePaid(data: Stripe.Event.Data) {
  const object = data.object as Stripe.Invoice;

  if (!object.customer_email) {
    return;
  }

  const { user } = await getOrCreateUser({
    emailId: object.customer_email,
    name: object.customer_name,
  });
  // Get first item
  const item = object.lines.data[0];
  if (!item) {
    throw new APIError("No item found in invoice");
  }

  if (item.subscription) {
    // Subscription is created, skip "customer.subscription.created" or "customer.subscription.updated" will handle this
    return;
  }

  const price = item.price;

  if (price) {
    // Check if item is a subscription
    const dbPlan = await getPlanFromStripePriceId(price.id);

    if (!dbPlan) {
      await handleOutsidePlanManagementProductInvoicePaid();
    } else {
      await updatePlan({
        userId: user.id,
        newPlanId: dbPlan.id,
      });

      // Allocate plan-based credits
      await allocatePlanCredits({
        userId: user.id,
        planId: dbPlan.id,
        paymentId: object.id,
        paymentMetadata: {
          source: "stripe_invoice",
          invoiceId: object.id,
          customerId: object.customer,
          subscriptionId: object.subscription,
        }
      });
    }
  } else {
    await handleOutsidePlanManagementProductInvoicePaid();
  }
}

export async function onCheckoutSessionCompleted(data: Stripe.Event.Data) {
  const object = data.object as Stripe.Checkout.Session;

  // Only proceed if payment was successful
  if (object.payment_status !== "paid") {
    return;
  }

  // If this is a subscription checkout, let subscription events handle it
  if (object.mode === "subscription") {
    return;
  }

  const customer = await getStripeCustomer(object.customer as string);
  if (!customer || !customer.email) {
    throw new APIError("No customer found in checkout session");
  }
  const { user } = await getOrCreateUser({
    emailId: customer.email,
    name: customer.name,
  });

  await db
    .update(users)
    .set({
      stripeCustomerId: customer.id,
    })
    .where(eq(users.id, user.id));

  // First, check if this is a credits purchase
  const isCreditsHandled = await handleCreditsPurchase(object, user);
  if (isCreditsHandled) {
    return; // Credits purchase was handled successfully
  }

  // If not credits, handle as plan purchase
  // Get line items to find the plan
  const lineItems = await stripe.checkout.sessions.listLineItems(object.id);

  if (lineItems.data.length === 0) {
    throw new APIError("No line items found in checkout session");
  }

  const firstItem = lineItems.data[0];
  if (!firstItem.price) {
    throw new APIError("No price found in checkout session line item");
  }

  const dbPlan = await getPlanFromStripePriceId(firstItem.price.id);

  if (!dbPlan) {
    // Handle outside plan management product - could be credits or other products
    return;
  }

  await updatePlan({
    userId: user.id,
    newPlanId: dbPlan.id,
  });

  // Allocate plan-based credits
  await allocatePlanCredits({
    userId: user.id,
    planId: dbPlan.id,
    paymentId: object.id,
    paymentMetadata: {
      source: "stripe_checkout",
      checkoutSessionId: object.id,
      paymentIntentId: object.payment_intent,
      customerId: customer.id,
      amountTotal: object.amount_total,
      currency: object.currency,
    }
  });
}
