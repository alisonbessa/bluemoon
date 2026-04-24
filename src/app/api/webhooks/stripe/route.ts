import Stripe from "stripe";
import stripe from "@/integrations/stripe";
import { NextRequest, NextResponse } from "next/server";
import APIError from "@/shared/lib/api/errors";
import { checkRateLimit, rateLimits } from "@/shared/lib/security/rate-limit";
import { logger } from "./handlers/helpers";
import {
  onSubscriptionCreated,
  onSubscriptionUpdated,
  onSubscriptionDeleted,
  onSubscriptionTrialWillEnd,
} from "./handlers/subscription-handlers";
import {
  onInvoicePaid,
  onInvoicePaymentFailed,
  onCheckoutSessionCompleted,
} from "./handlers/payment-handlers";
import { onCustomerCreated } from "./handlers/customer-handlers";

async function handler(req: NextRequest) {
  const rateLimitResponse = await checkRateLimit(req, rateLimits.webhook, "stripe-webhook");
  if (rateLimitResponse) return rateLimitResponse;

  if (req.method === "POST") {
    // SECURITY: Webhook secret is required
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      logger.error("SECURITY: STRIPE_WEBHOOK_SECRET not configured");
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
      logger.info("Event received", { eventType: event.type });
    } catch (err) {
      logger.error("Stripe signature verification failed", err);
      return NextResponse.json(
        { error: "Webhook signature verification failed" },
        { status: 400 }
      );
    }

    const { data, type: eventType } = event;

    try {
      logger.info("Processing event", { eventType });
      switch (eventType) {
        case "invoice.paid":
          await onInvoicePaid(data);
          break;
        case "invoice.payment_failed":
          await onInvoicePaymentFailed(data);
          break;
        case "checkout.session.completed":
          await onCheckoutSessionCompleted(data);
          break;
        case "customer.created":
          await onCustomerCreated(data);
          break;
        case "customer.subscription.created":
          await onSubscriptionCreated(data);
          break;
        case "customer.subscription.updated":
          await onSubscriptionUpdated(data);
          break;
        case "customer.subscription.deleted":
          await onSubscriptionDeleted(data);
          break;
        case "customer.subscription.trial_will_end":
          await onSubscriptionTrialWillEnd(data);
          break;
        default:
          // Unhandled event type
          break;
      }
    } catch (error) {
      logger.error(`Error processing ${eventType}`, error);
      if (error instanceof APIError) {
        return NextResponse.json({
          received: true,
          message: error.message,
        });
      }
      // Log non-APIError exceptions
      return NextResponse.json({
        received: true,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
    // Return a response to acknowledge receipt of the event.
    return NextResponse.json({ received: true });
  }
}

export const POST = handler;

export const maxDuration = 20;
