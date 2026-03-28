/**
 * Derives transaction scope (memberId) from the associated category.
 *
 * - For expenses: scope = category.memberId (NULL = shared, set = personal)
 * - For income: scope = incomeSource.memberId (who receives the income)
 * - For transfers / unknown: scope = fallbackMemberId (the current user)
 *
 * Used by web API (POST/PATCH), messaging handlers, and recurring transaction generation.
 */

interface CategoryLike {
  id: string;
  memberId?: string | null;
}

interface IncomeSourceLike {
  id: string;
  memberId?: string | null;
}

/**
 * Returns the scope memberId for an expense transaction based on its category.
 * If the category is shared (memberId = null), returns null.
 * If category is not found, returns fallbackMemberId (personal to the creator).
 */
export function getScopeFromCategory(
  categoryId: string | undefined | null,
  categories: CategoryLike[],
  fallbackMemberId: string,
): string | null {
  if (!categoryId) return fallbackMemberId;
  const cat = categories.find((c) => c.id === categoryId);
  return cat ? (cat.memberId ?? null) : fallbackMemberId;
}

/**
 * Returns the scope memberId for an income transaction based on its income source.
 * If the source is shared (memberId = null), returns null.
 * If source is not found, returns fallbackMemberId.
 */
export function getScopeFromIncomeSource(
  incomeSourceId: string | undefined | null,
  incomeSources: IncomeSourceLike[],
  fallbackMemberId: string,
): string | null {
  if (!incomeSourceId) return fallbackMemberId;
  const source = incomeSources.find((s) => s.id === incomeSourceId);
  return source ? (source.memberId ?? null) : fallbackMemberId;
}
