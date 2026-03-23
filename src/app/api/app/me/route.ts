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
import { checkUserAccess } from "@/shared/lib/users/checkPartnerAccess";
import stripe from "@/integrations/stripe";
import { recordAuditLog } from "@/shared/lib/security/audit-log";

export const GET = withAuthRequired(async (req, context) => {
  const { getCurrentPlan, getUser, session } = context;

  // Run all queries in parallel
  const [userFromDb, currentPlan, { hasPartnerAccess, hasBudget }] =
    await Promise.all([
      getUser(),
      getCurrentPlan(),
      checkUserAccess(session.user.id),
    ]);

  // If user doesn't exist in database, return 401 to force re-login
  if (!userFromDb) {
    return unauthorizedError("User not found - please sign in again");
  }

  return NextResponse.json<MeResponse>(
    { user: userFromDb, currentPlan, hasPartnerAccess, hasBudget },
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

    // Parse optional deletion reason and cascade flag from request body
    let reason: string | undefined;
    let deleteAllData = false;
    try {
      const body = await req.json();
      reason = body.reason;
      deleteAllData = body.deleteAllData === true;
    } catch {
      // No body provided, that's fine
    }

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

    // Record audit log for LGPD compliance (before deletion, so the user reference still exists)
    await recordAuditLog({
      userId: session.user.id,
      action: "user.delete",
      resource: "user",
      resourceId: session.user.id,
      details: {
        type: deleteAllData ? "hard_deletion_with_cascade" : "lgpd_deletion_request",
        reason: reason || "not provided",
        deleteAllData,
      },
      req,
    });

    if (deleteAllData) {
      // Hard delete: permanently remove user and cascade all related data
      // Foreign keys with onDelete: "cascade" will handle:
      // accounts, sessions, authenticators, feedbacks, budget_members,
      // invites, credits, whatsapp_users, telegram_users, telegram_pending_connections,
      // whatsapp_pending_connections, telegram_ai_logs
      // Foreign keys with onDelete: "set null" will nullify references in:
      // audit_logs, access_links
      await db.delete(users).where(eq(users.id, session.user.id));

      logger.info(`Hard deletion completed for user ${session.user.id} - all data removed`);

      return successResponse({
        success: true,
        message: "Sua conta e todos os seus dados foram permanentemente excluídos.",
      });
    } else {
      // LGPD soft delete: mark account as deleted instead of hard deleting
      // Data will be permanently removed after 30 days as per Privacy Policy
      const now = new Date();
      await db
        .update(users)
        .set({
          deletedAt: now,
          deletionRequestedAt: now,
          deletionReason: reason || null,
        })
        .where(eq(users.id, session.user.id));

      logger.info(`LGPD deletion requested for user ${session.user.id}`);

      return successResponse({
        success: true,
        message: "Sua conta foi desativada e seus dados serão excluídos em até 30 dias.",
      });
    }
  } catch (error) {
    logger.error("Error deleting account:", error);
    return internalError("Failed to delete account");
  }
});
