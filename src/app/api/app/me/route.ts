import withAuthRequired from "@/shared/lib/auth/withAuthRequired";
import { createLogger } from "@/shared/lib/logger";
import { profileUpdateSchema } from "@/shared/lib/validations/profile.schema";

const logger = createLogger("api:me");
import { db } from "@/db";
import { users } from "@/db/schema/user";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { MeResponse } from "./types";
import {
  validationError,
  unauthorizedError,
  notFoundError,
  successResponse,
  internalError,
} from "@/shared/lib/api/responses";
import { checkPartnerAccess } from "@/shared/lib/users/checkPartnerAccess";
import stripe from "@/integrations/stripe";

export const GET = withAuthRequired(async (req, context) => {
  const { getCurrentPlan, getUser, session } = context;

  // You can also use context.session to get user id and email
  // from the jwt token (no database call is made in that case)

  const userFromDb = await getUser();

  // If user doesn't exist in database, return 401 to force re-login
  if (!userFromDb) {
    return unauthorizedError("User not found - please sign in again");
  }

  const currentPlan = await getCurrentPlan();

  // Check if user has access through a partner relationship
  const hasPartnerAccess = await checkPartnerAccess(session.user.id);

  return NextResponse.json<MeResponse>(
    { user: userFromDb, currentPlan, hasPartnerAccess },
    {
      headers: {
        "Cache-Control": "private, max-age=30, stale-while-revalidate=60",
      },
    }
  );
});

export const PATCH = withAuthRequired(async (req, context) => {
  try {
    const { session } = context;
    const body = await req.json();

    // Validate input data
    const validationResult = profileUpdateSchema.safeParse(body);

    if (!validationResult.success) {
      return validationError(validationResult.error);
    }

    const { name, displayName, image } = validationResult.data;

    // Build update object with only provided fields
    const updateData: Record<string, string | null | undefined> = {};
    if (name !== undefined) updateData.name = name;
    if (displayName !== undefined) updateData.displayName = displayName;
    if (image !== undefined) updateData.image = image;

    // Update user in database
    const updatedUser = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, session.user.id))
      .returning();

    if (!updatedUser.length) {
      return notFoundError("User");
    }

    // Return updated user data
    return successResponse({
      user: updatedUser[0],
      message: "Profile updated successfully",
    });
  } catch (error) {
    logger.error("Error updating profile:", error);
    return internalError("Failed to update profile");
  }
});

export const DELETE = withAuthRequired(async (req, context) => {
  try {
    const { session, getUser } = context;

    // Get user to check for Stripe subscription
    const user = await getUser();

    // Cancel Stripe subscription if exists
    if (user?.stripeSubscriptionId) {
      try {
        const subscription = await stripe.subscriptions.retrieve(
          user.stripeSubscriptionId
        );

        // Only cancel if not already canceled
        if (subscription.status !== "canceled") {
          await stripe.subscriptions.cancel(user.stripeSubscriptionId);
          logger.info(`Cancelled Stripe subscription ${user.stripeSubscriptionId} for user ${session.user.id}`);
        }
      } catch (stripeError) {
        // Log but don't fail - user still wants to delete account
        logger.error("Error cancelling Stripe subscription:", stripeError);
      }
    }

    // Delete the user - cascade will handle related data
    await db.delete(users).where(eq(users.id, session.user.id));

    return successResponse({
      success: true,
      message: "Account deleted successfully",
    });
  } catch (error) {
    logger.error("Error deleting account:", error);
    return internalError("Failed to delete account");
  }
});
