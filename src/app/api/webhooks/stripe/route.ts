import Stripe from "stripe";
import stripe from "@/integrations/stripe";
import { NextRequest, NextResponse } from "next/server";
import APIError from "@/shared/lib/api/errors";
import getOrCreateUser from "@/shared/lib/users/getOrCreateUser";
import { users } from "@/db/schema/user";
import { plans } from "@/db/schema/plans";
import { db } from "@/db";
import { eq, or } from "drizzle-orm";
import updatePlan from "@/shared/lib/plans/updatePlan";
import downgradeToDefaultPlan from "@/shared/lib/plans/downgradeToDefaultPlan";
import { addCredits } from "@/shared/lib/credits/recalculate";
import { type CreditType } from "@/shared/lib/credits/credits";
import { creditTypeSchema } from "@/shared/lib/credits/config";
import { allocatePlanCredits } from "@/shared/lib/credits/allocatePlanCredits";

class StripeWebhookHandler {
  private data: Stripe.Event.Data;
  private eventType: string;

  constructor(data: Stripe.Event.Data, eventType: string) {
    this.data = data;
    this.eventType = eventType;
  }
  async handleOutsidePlanManagementProductInvoicePaid() {
    // Handle non-plan products here (e.g., credits, one-time purchases)
  }

  /**
   * Handles credits purchase from checkout session
   * @param checkoutSession - Stripe checkout session
   * @param user - User object
   */
  async handleCreditsPurchase(checkoutSession: Stripe.Checkout.Session, user: { id: string; email: string }) {
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

  async onInvoicePaid() {
    // @ts-expect-error Stripe types are not fully compatible with Next.js
    const object: Stripe.Invoice = this.data.object;

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
      const dbPlan = await this._getPlanFromStripePriceId(price.id);

      if (!dbPlan) {
        await this.handleOutsidePlanManagementProductInvoicePaid();
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
      await this.handleOutsidePlanManagementProductInvoicePaid();
    }
  }

  async _getPlanFromStripePriceId(priceId: string) {
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

  async onSubscriptionUpdated() {
    // @ts-expect-error Stripe types are not fully compatible with Next.js
    const object: Stripe.Subscription = this.data.object;

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

    const dbPlan = await this._getPlanFromStripePriceId(price.id);
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

  async _getStripeCustomer(
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

  async onSubscriptionCreated() {
    // @ts-expect-error Stripe types are not fully compatible with Next.js
    const object: Stripe.Subscription = this.data.object;
    const price = object.items.data[0].price;

    if (!price) {
      throw new APIError("No price found in subscription");
    }

    const customer = await this._getStripeCustomer(object.customer);
    if (!customer || !customer.email) {
      throw new APIError("No customer found in subscription");
    }
    const { user } = await getOrCreateUser({
      emailId: customer.email,
      name: customer.name,
    });
    const dbPlan = await this._getPlanFromStripePriceId(price.id);

    if (!dbPlan) {
      // TIP: Handle outside plan management subscription
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

    await updatePlan({ userId: user.id, newPlanId: dbPlan.id });

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
  }

  /**
   * Handles the trial_will_end event - fired 3 days before trial ends
   * This is useful for sending reminder emails to users
   */
  async onSubscriptionTrialWillEnd() {
    // @ts-expect-error Stripe types are not fully compatible with Next.js
    const object: Stripe.Subscription = this.data.object;

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

  async onSubscriptionDeleted() {
    // @ts-expect-error Stripe types are not fully compatible with Next.js
    const object: Stripe.Subscription = this.data.object;

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

  async onCustomerCreated() {
    // @ts-expect-error Stripe types are not fully compatible with Next.js
    const object: Stripe.Customer = this.data.object;
    if (!object.email) {
      throw new APIError("No email found in customer");
    }
    const { user } = await getOrCreateUser({
      emailId: object.email,
      name: object.name,
    });
    await db
      .update(users)
      .set({ stripeCustomerId: object.id })
      .where(eq(users.id, user.id));
  }

  async onCheckoutSessionCompleted() {
    // @ts-expect-error Stripe types are not fully compatible with Next.js
    const object: Stripe.Checkout.Session = this.data.object;

    // Only proceed if payment was successful
    if (object.payment_status !== "paid") {
      return;
    }

    // If this is a subscription checkout, let subscription events handle it
    if (object.mode === "subscription") {
      return;
    }

    const customer = await this._getStripeCustomer(object.customer as string);
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
    const isCreditsHandled = await this.handleCreditsPurchase(object, user);
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

    const dbPlan = await this._getPlanFromStripePriceId(firstItem.price.id);

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
}

async function handler(req: NextRequest) {
  if (req.method === "POST") {
    let data;
    let eventType;

    // SECURITY: Webhook secret is required
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error("SECURITY: STRIPE_WEBHOOK_SECRET not configured");
      return NextResponse.json(
        { error: "Webhook not properly configured" },
        { status: 500 }
      );
    }

    // Retrieve the event by verifying the signature using the raw body and secret.
    let event: Stripe.Event;
    const signature = req.headers.get("stripe-signature") as string;

    try {
      const body = await req.text();
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      console.error(`Webhook signature verification failed.`, err);
      return NextResponse.json(
        { error: "Webhook signature verification failed" },
        { status: 400 }
      );
    }

    // Extract the object from the event.
    data = event.data;
    eventType = event.type;

    const handler = new StripeWebhookHandler(data, eventType);
    try {
      switch (eventType) {
        case "invoice.paid":
          await handler.onInvoicePaid();
          break;
        case "checkout.session.completed":
          await handler.onCheckoutSessionCompleted();
          break;
        case "customer.created":
          await handler.onCustomerCreated();
          break;
        case "customer.subscription.created":
          await handler.onSubscriptionCreated();
          break;
        case "customer.subscription.updated":
          await handler.onSubscriptionUpdated();
          break;
        case "customer.subscription.deleted":
          await handler.onSubscriptionDeleted();
          break;
        case "customer.subscription.trial_will_end":
          await handler.onSubscriptionTrialWillEnd();
          break;
        default:
          // Unhandled event type
          break;
      }
    } catch (error) {
      if (error instanceof APIError) {
        return NextResponse.json({
          received: true,
          message: error.message,
        });
      }
    }
    // Return a response to acknowledge receipt of the event.
    return NextResponse.json({ received: true });
  }
}

export const POST = handler;

export const maxDuration = 20;
