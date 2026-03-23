import { db } from "@/db";
import { budgetMembers, users } from "@/db/schema";
import { eq, and, inArray, sql } from "drizzle-orm";

// Roles that don't require a Stripe subscription
const SUBSCRIPTION_EXEMPT_ROLES = ["beta", "lifetime", "admin"];

interface UserAccessInfo {
  hasPartnerAccess: boolean;
  hasBudget: boolean;
  primaryBudgetId: string | null;
}

/**
 * Checks user's budget membership and partner access with minimal queries.
 * Returns hasBudget, hasPartnerAccess, and primaryBudgetId in 1-2 queries total
 * (down from 2N+1 where N = number of partner memberships).
 */
export async function checkUserAccess(userId: string): Promise<UserAccessInfo> {
  // Query 1: get all budget memberships for this user
  const allMemberships = await db
    .select({
      budgetId: budgetMembers.budgetId,
      type: budgetMembers.type,
    })
    .from(budgetMembers)
    .where(eq(budgetMembers.userId, userId));

  const hasBudget = allMemberships.length > 0;
  const primaryBudgetId = allMemberships[0]?.budgetId ?? null;

  // Filter to only partner memberships for the access check
  const partnerBudgetIds = allMemberships
    .filter((m) => m.type === "partner")
    .map((m) => m.budgetId);

  if (partnerBudgetIds.length === 0) {
    return { hasPartnerAccess: false, hasBudget, primaryBudgetId };
  }

  // Query 2: Single JOIN query to check if any partner budget has an owner
  // with an active subscription or exempt role (replaces the N+1 loop)
  const ownersWithAccess = await db
    .select({
      budgetId: budgetMembers.budgetId,
    })
    .from(budgetMembers)
    .innerJoin(users, eq(users.id, budgetMembers.userId))
    .where(
      and(
        inArray(budgetMembers.budgetId, partnerBudgetIds),
        eq(budgetMembers.type, "owner"),
        sql`(${users.stripeSubscriptionId} IS NOT NULL OR ${users.role} IN (${sql.join(SUBSCRIPTION_EXEMPT_ROLES.map(r => sql`${r}`), sql`, `)}))`
      )
    )
    .limit(1);

  const hasPartnerAccess = ownersWithAccess.length > 0;
  return { hasPartnerAccess, hasBudget, primaryBudgetId };
}

/**
 * @deprecated Use checkUserAccess() instead to avoid redundant queries.
 * Kept for backward compatibility with existing callers.
 */
export async function checkPartnerAccess(userId: string): Promise<boolean> {
  const { hasPartnerAccess } = await checkUserAccess(userId);
  return hasPartnerAccess;
}
