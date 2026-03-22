import { NextResponse } from "next/server";
import withSuperAdminAuthRequired from "@/shared/lib/auth/withSuperAdminAuthRequired";
import { db } from "@/db";
import { users } from "@/db/schema/user";
import { and, isNotNull, ne, eq } from "drizzle-orm";
import stripe from "@/integrations/stripe";
import { render } from "@react-email/components";
import MigrationToBeta from "@/emails/MigrationToBeta";
import sendMail from "@/shared/lib/email/sendMail";
import { appConfig } from "@/shared/lib/config";
import { createLogger } from "@/shared/lib/logger";

const logger = createLogger("api:sa:migrate-to-beta");

/**
 * POST /api/super-admin/migrate-to-beta
 *
 * One-time migration: converts all active/trialing users to beta.
 * - Cancels their Stripe subscriptions
 * - Sets role to "beta"
 * - Clears Stripe subscription data
 * - Sends an explanatory email
 *
 * Safe to run multiple times (skips already-beta users).
 */
export const POST = withSuperAdminAuthRequired(async () => {
  try {
    // Find all users with active Stripe subscriptions who are NOT already beta
    const usersToMigrate = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        role: users.role,
        stripeSubscriptionId: users.stripeSubscriptionId,
        stripeCustomerId: users.stripeCustomerId,
      })
      .from(users)
      .where(
        and(
          isNotNull(users.stripeSubscriptionId),
          ne(users.role, "beta"),
          ne(users.role, "admin")
        )
      );

    logger.info(`Found ${usersToMigrate.length} users to migrate to beta`);

    const results: {
      email: string;
      status: "migrated" | "stripe_error" | "email_error";
      error?: string;
    }[] = [];

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    for (const user of usersToMigrate) {
      try {
        // 1. Cancel Stripe subscription
        if (user.stripeSubscriptionId) {
          try {
            const subscription = await stripe.subscriptions.retrieve(
              user.stripeSubscriptionId
            );

            if (subscription.status !== "canceled") {
              await stripe.subscriptions.cancel(user.stripeSubscriptionId);
              logger.info(`Cancelled Stripe subscription for ${user.email}`);
            }
          } catch (stripeError) {
            logger.error(
              `Stripe error for ${user.email}`,
              stripeError
            );
            results.push({
              email: user.email || "unknown",
              status: "stripe_error",
              error: String(stripeError),
            });
            continue; // Skip this user, don't change their role
          }
        }

        // 2. Update user: set role to beta, clear Stripe data
        await db
          .update(users)
          .set({
            role: "beta",
            stripeSubscriptionId: null,
            trialEndsAt: null,
          })
          .where(eq(users.id, user.id));

        // 3. Send migration email
        try {
          const html = await render(
            MigrationToBeta({
              userName: user.name || "Usuário",
              dashboardUrl: `${baseUrl}/app`,
            })
          );
          await sendMail(
            user.email!,
            `Novidades sobre sua conta no ${appConfig.projectName}`,
            html
          );
        } catch (emailError) {
          logger.error(`Email error for ${user.email}`, emailError);
          // User was already migrated, just log the email failure
          results.push({
            email: user.email || "unknown",
            status: "email_error",
            error: String(emailError),
          });
          continue;
        }

        results.push({
          email: user.email || "unknown",
          status: "migrated",
        });

        logger.info(`Successfully migrated ${user.email} to beta`);
      } catch (error) {
        logger.error(`Error migrating ${user.email}`, error);
        results.push({
          email: user.email || "unknown",
          status: "stripe_error",
          error: String(error),
        });
      }
    }

    const migrated = results.filter((r) => r.status === "migrated").length;
    const errors = results.filter((r) => r.status !== "migrated").length;

    return NextResponse.json({
      success: true,
      total: usersToMigrate.length,
      migrated,
      errors,
      results,
    });
  } catch (error) {
    logger.error("Migration failed", error);
    return NextResponse.json(
      { error: "Migration failed", details: String(error) },
      { status: 500 }
    );
  }
});
