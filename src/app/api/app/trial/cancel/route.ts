import { NextResponse } from "next/server";
import withAuthRequired from "@/shared/lib/auth/withAuthRequired";
import stripe from "@/integrations/stripe";
import { db } from "@/db";
import { users } from "@/db/schema/user";
import { eq } from "drizzle-orm";

/**
 * POST /api/app/trial/cancel
 *
 * Cancels the user's trial/subscription immediately.
 * This will cancel the subscription at the end of the current period
 * (which for trials means immediately since no payment was made).
 */
export const POST = withAuthRequired(async (_req, { getUser, session }) => {
  try {
    const user = await getUser();

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    if (!user.stripeSubscriptionId) {
      return NextResponse.json(
        { error: "No active subscription found" },
        { status: 400 }
      );
    }

    // Get current subscription status
    const subscription = await stripe.subscriptions.retrieve(
      user.stripeSubscriptionId
    );

    // If already cancelled, return success
    if (subscription.status === "canceled") {
      return NextResponse.json({
        success: true,
        message: "Subscription already cancelled",
      });
    }

    // For trials, cancel immediately without charging
    // For active subscriptions, cancel at period end
    if (subscription.status === "trialing") {
      // Cancel immediately during trial - no charges will be made
      await stripe.subscriptions.cancel(user.stripeSubscriptionId);

      // Clear trial end date
      await db
        .update(users)
        .set({ trialEndsAt: null })
        .where(eq(users.id, session.user.id));

      return NextResponse.json({
        success: true,
        message: "Trial cancelled successfully. No charges were made.",
        cancelledAt: new Date().toISOString(),
      });
    } else {
      // For active subscriptions, cancel at period end
      await stripe.subscriptions.update(user.stripeSubscriptionId, {
        cancel_at_period_end: true,
      });

      return NextResponse.json({
        success: true,
        message: "Subscription will be cancelled at the end of the billing period",
        cancelAtPeriodEnd: true,
        currentPeriodEnd: subscription.current_period_end
          ? new Date(subscription.current_period_end * 1000).toISOString()
          : null,
      });
    }
  } catch (error) {
    console.error("Error cancelling trial/subscription:", error);
    return NextResponse.json(
      { error: "Failed to cancel subscription" },
      { status: 500 }
    );
  }
});
