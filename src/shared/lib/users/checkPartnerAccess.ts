import { db } from "@/db";
import { budgetMembers, users } from "@/db/schema";
import { eq, and } from "drizzle-orm";

// Roles that don't require a Stripe subscription
const SUBSCRIPTION_EXEMPT_ROLES = ["beta", "lifetime", "admin"];

/**
 * Checks if a user has access through a partner relationship.
 * A user has partner access if they are a "partner" member of a budget
 * where the owner has an active subscription or an exempt role.
 */
export async function checkPartnerAccess(userId: string): Promise<boolean> {
  // Find all budgets where the user is a partner
  const partnerMemberships = await db
    .select({
      budgetId: budgetMembers.budgetId,
    })
    .from(budgetMembers)
    .where(
      and(
        eq(budgetMembers.userId, userId),
        eq(budgetMembers.type, "partner")
      )
    );

  if (partnerMemberships.length === 0) {
    return false;
  }

  // For each budget, find the owner and check if they have an active subscription
  for (const membership of partnerMemberships) {
    // Find the owner of this budget
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

    // Get the owner's user record to check subscription
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

    // Check if owner has an active subscription or exempt role
    const hasSubscription = owner.stripeSubscriptionId !== null;
    const hasExemptRole = owner.role && SUBSCRIPTION_EXEMPT_ROLES.includes(owner.role);

    if (hasSubscription || hasExemptRole) {
      return true;
    }
  }

  return false;
}
