import { db } from "@/db";
import { budgetMembers, budgets } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import type { PrivacyLevel } from "@/db/schema/budget-members";
import type { PrivacyMode } from "@/db/schema/budgets";

export type MemberType = "owner" | "partner" | "child" | "pet";

interface BudgetMembership {
  budgetId: string;
  type: MemberType;
}

/**
 * Get all budget IDs that a user has access to
 */
export async function getUserBudgetIds(userId: string): Promise<string[]> {
  const memberships = await db
    .select({ budgetId: budgetMembers.budgetId })
    .from(budgetMembers)
    .where(eq(budgetMembers.userId, userId));
  return memberships.map((m) => m.budgetId);
}

/**
 * Get all budget memberships for a user, including their role
 */
export async function getUserBudgetMemberships(
  userId: string
): Promise<BudgetMembership[]> {
  const memberships = await db
    .select({
      budgetId: budgetMembers.budgetId,
      type: budgetMembers.type,
    })
    .from(budgetMembers)
    .where(eq(budgetMembers.userId, userId));

  return memberships.map((m) => ({
    budgetId: m.budgetId,
    type: m.type as MemberType,
  }));
}

/**
 * Check if a user has access to a specific budget
 */
export async function userHasAccessToBudget(
  userId: string,
  budgetId: string
): Promise<boolean> {
  const budgetIds = await getUserBudgetIds(userId);
  return budgetIds.includes(budgetId);
}

/**
 * Check if a user has a specific role (or higher) in a budget
 * Role hierarchy: owner > partner > child/pet
 */
export async function userHasRoleInBudget(
  userId: string,
  budgetId: string,
  requiredRoles: MemberType[]
): Promise<boolean> {
  const memberships = await getUserBudgetMemberships(userId);
  const membership = memberships.find((m) => m.budgetId === budgetId);

  if (!membership) return false;
  return requiredRoles.includes(membership.type);
}

/**
 * Authorize a user for budget access
 * Returns authorization result with error message if failed
 */
export async function authorizeBudgetAccess(
  userId: string,
  budgetId: string,
  requiredRoles?: MemberType[]
): Promise<{ authorized: boolean; reason?: string }> {
  const memberships = await getUserBudgetMemberships(userId);
  const membership = memberships.find((m) => m.budgetId === budgetId);

  if (!membership) {
    return { authorized: false, reason: "Budget not found or access denied" };
  }

  if (requiredRoles && !requiredRoles.includes(membership.type)) {
    return { authorized: false, reason: "Insufficient permissions" };
  }

  return { authorized: true };
}

/**
 * Get user's member ID in a specific budget
 */
export async function getUserMemberIdInBudget(
  userId: string,
  budgetId: string
): Promise<string | null> {
  const membership = await db
    .select({ memberId: budgetMembers.id })
    .from(budgetMembers)
    .where(
      and(eq(budgetMembers.userId, userId), eq(budgetMembers.budgetId, budgetId))
    )
    .limit(1);
  return membership[0]?.memberId || null;
}

/**
 * Get partner's privacy level in a budget.
 * Uses the budget-level privacyMode field and maps it to PrivacyLevel.
 * Returns "all_visible" if not set (safe default).
 */
export async function getPartnerPrivacyLevel(
  _userId: string,
  budgetId: string
): Promise<PrivacyLevel> {
  const [budget] = await db
    .select({ privacyMode: budgets.privacyMode })
    .from(budgets)
    .where(eq(budgets.id, budgetId))
    .limit(1);

  return mapPrivacyModeToLevel(budget?.privacyMode);
}

/**
 * Map budget-level PrivacyMode to viewMode-compatible PrivacyLevel.
 * Budget uses: visible | unified | private
 * ViewMode filter uses: all_visible | unified | private
 */
function mapPrivacyModeToLevel(mode: PrivacyMode | null | undefined): PrivacyLevel {
  switch (mode) {
    case "unified": return "unified";
    case "private": return "private";
    default: return "all_visible";
  }
}
