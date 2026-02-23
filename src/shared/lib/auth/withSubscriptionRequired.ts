import { db } from "@/db";
import { users } from "@/db/schema/user";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { checkPartnerAccess } from "@/shared/lib/users/checkPartnerAccess";

const SUBSCRIPTION_EXEMPT_ROLES = ["beta", "lifetime", "admin"];

/**
 * Error code returned when a user without active subscription tries a mutation.
 * Frontend can detect this code and show appropriate UI.
 */
export const SUBSCRIPTION_REQUIRED_CODE = "SUBSCRIPTION_REQUIRED";

/**
 * Checks if a user has an active subscription, exempt role, or partner access.
 * Returns null if access is granted, or a NextResponse with 403 if not.
 *
 * Usage in API routes:
 * ```
 * export const POST = withAuthRequired(async (req, { session, getUser }) => {
 *   const subscriptionError = await requireActiveSubscription(session.user.id);
 *   if (subscriptionError) return subscriptionError;
 *   // ... handle request
 * });
 * ```
 */
export async function requireActiveSubscription(
  userId: string
): Promise<NextResponse | null> {
  const [user] = await db
    .select({
      stripeSubscriptionId: users.stripeSubscriptionId,
      role: users.role,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) {
    return NextResponse.json(
      {
        error: "Sua assinatura expirou. Reative para continuar.",
        code: SUBSCRIPTION_REQUIRED_CODE,
      },
      { status: 403 }
    );
  }

  // Exempt roles bypass subscription check
  if (user.role && SUBSCRIPTION_EXEMPT_ROLES.includes(user.role)) {
    return null;
  }

  // Active Stripe subscription
  if (user.stripeSubscriptionId) {
    return null;
  }

  // Partner access through budget owner
  const hasPartner = await checkPartnerAccess(userId);
  if (hasPartner) {
    return null;
  }

  // No access
  return NextResponse.json(
    {
      error: "Sua assinatura expirou. Reative seu plano para continuar registrando.",
      code: SUBSCRIPTION_REQUIRED_CODE,
    },
    { status: 403 }
  );
}
