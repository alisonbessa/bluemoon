import { db } from "@/db";
import { budgetMembers, users } from "@/db/schema";
import { eq, and } from "drizzle-orm";

// Roles that don't require a Stripe subscription
const SUBSCRIPTION_EXEMPT_ROLES = ["beta", "lifetime", "admin"];

interface UserAccessInfo {
  hasPartnerAccess: boolean;
  hasBudget: boolean;
}

/**
 * Checks user's budget membership and partner access in a single pass.
 * Returns both hasBudget (user has any budget) and hasPartnerAccess
 * (user is a partner in a budget where the owner has an active subscription).
 */
export async function checkUserAccess(userId: string): Promise<UserAccessInfo> {
  // Single query: get all budget memberships for this user
  const allMemberships = await db
    .select({
      budgetId: budgetMembers.budgetId,
      type: budgetMembers.type,
    })
    .from(budgetMembers)
    .where(eq(budgetMembers.userId, userId));

  const hasBudget = allMemberships.length > 0;

  // Filter to only partner memberships for the access check
  const partnerMemberships = allMemberships.filter((m) => m.type === "partner");

  if (partnerMemberships.length === 0) {
    return { hasPartnerAccess: false, hasBudget };
  }

  // For each partner membership, check if the budget owner has an active subscription
  for (const membership of partnerMemberships) {
    const ownerMembership = await db
      .select({
        userId: budgetMembers.userId,
      })
      .from(budgetMembers)
      .where(
        and(
          eq(budgetMembers.budgetId, membership.budgetId),
          eq(budgetMembers.type, "owner")
        )
      )
      .limit(1);

    if (ownerMembership.length === 0 || !ownerMembership[0].userId) {
      continue;
    }

    const [owner] = await db
      .select({
        stripeSubscriptionId: users.stripeSubscriptionId,
        role: users.role,
      })
      .from(users)
      .where(eq(users.id, ownerMembership[0].userId))
      .limit(1);

    if (!owner) {
      continue;
    }

    const hasSubscription = owner.stripeSubscriptionId !== null;
    const hasExemptRole = owner.role && SUBSCRIPTION_EXEMPT_ROLES.includes(owner.role);

    if (hasSubscription || hasExemptRole) {
      return { hasPartnerAccess: true, hasBudget };
    }
  }

  return { hasPartnerAccess: false, hasBudget };
}

/**
 * @deprecated Use checkUserAccess() instead to avoid redundant queries.
 * Kept for backward compatibility with existing callers.
 */
export async function checkPartnerAccess(userId: string): Promise<boolean> {
  const { hasPartnerAccess } = await checkUserAccess(userId);
  return hasPartnerAccess;
}
