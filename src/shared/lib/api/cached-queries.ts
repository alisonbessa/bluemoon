import { cache } from "react";
import { auth } from "@/auth";
import { getUserBudgetIds, getUserMemberIdInBudget, getPartnerPrivacyLevel } from "./permissions";
import { checkUserAccess } from "@/shared/lib/users/checkPartnerAccess";
import type { PrivacyLevel } from "@/db/schema/budget-members";

/**
 * React.cache() wrappers for server-side query deduplication.
 *
 * Within a single React Server Component render pass, these functions
 * are called once and the result is reused across all components in
 * the same request. This eliminates duplicate DB queries when multiple
 * server components need the same data (e.g., auth session, budget IDs).
 */

/** Cached auth() — deduplicated per request */
export const getSession = cache(async () => {
  return auth();
});

/** Cached getUserBudgetIds — deduplicated per (userId) per request */
export const getCachedBudgetIds = cache(async (userId: string): Promise<string[]> => {
  return getUserBudgetIds(userId);
});

/** Cached getUserMemberIdInBudget — deduplicated per (userId, budgetId) per request */
export const getCachedMemberId = cache(async (userId: string, budgetId: string): Promise<string | null> => {
  return getUserMemberIdInBudget(userId, budgetId);
});

/** Cached getPartnerPrivacyLevel — deduplicated per (userId, budgetId) per request */
export const getCachedPartnerPrivacy = cache(async (userId: string, budgetId: string): Promise<PrivacyLevel> => {
  return getPartnerPrivacyLevel(userId, budgetId);
});

/** Cached checkUserAccess — deduplicated per (userId) per request */
export const getCachedUserAccess = cache(async (userId: string) => {
  return checkUserAccess(userId);
});
