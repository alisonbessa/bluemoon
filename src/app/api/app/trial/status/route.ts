import { NextResponse } from "next/server";
import withAuthRequired from "@/shared/lib/auth/withAuthRequired";
import stripe from "@/integrations/stripe";

/**
 * GET /api/app/trial/status
 *
 * Returns the current trial status for the authenticated user.
 * Includes days remaining, end date, and subscription status.
 */
export const GET = withAuthRequired(async (_req, { getUser }) => {
  try {
    const user = await getUser();

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // If user has no subscription, they're not in a trial
    if (!user.stripeSubscriptionId) {
      return NextResponse.json({
        hasTrial: false,
        isTrialing: false,
        trialEndsAt: null,
        daysRemaining: null,
        subscriptionStatus: null,
      });
    }

    // Get subscription from Stripe for real-time status
    const subscription = await stripe.subscriptions.retrieve(
      user.stripeSubscriptionId
    );

    const isTrialing = subscription.status === "trialing";
    const trialEndsAt = subscription.trial_end
      ? new Date(subscription.trial_end * 1000)
      : user.trialEndsAt;

    // Calculate days remaining
    let daysRemaining: number | null = null;
    if (trialEndsAt) {
      const now = new Date();
      const diffTime = trialEndsAt.getTime() - now.getTime();
      daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (daysRemaining < 0) daysRemaining = 0;
    }

    return NextResponse.json({
      hasTrial: !!trialEndsAt,
      isTrialing,
      trialEndsAt: trialEndsAt?.toISOString() ?? null,
      daysRemaining,
      subscriptionStatus: subscription.status,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
    });
  } catch (error) {
    console.error("Error fetching trial status:", error);
    return NextResponse.json(
      { error: "Failed to fetch trial status" },
      { status: 500 }
    );
  }
});
