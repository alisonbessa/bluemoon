import { eq, isNull, ne, and, or, type SQL } from "drizzle-orm";
import type { PgColumn } from "drizzle-orm/pg-core";
import type { PrivacyLevel } from "@/db/schema/budget-members";

export type ViewMode = "mine" | "shared" | "all";

/**
 * Parse and validate the viewMode query parameter.
 * Returns "mine" if not provided or invalid (safe default).
 */
export function parseViewMode(searchParams: URLSearchParams): ViewMode {
  const raw = searchParams.get("viewMode");
  if (raw === "mine" || raw === "shared" || raw === "all") {
    return raw;
  }
  return "mine";
}

/**
 * Build a SQL condition for filtering by viewMode.
 *
 * - "mine": ownerField = userMemberId (+ shared items when includeSharedInMine is true)
 *   For transactions: also includes items paid by user for others (when paidByField is provided
 *   and partner privacy is "all_visible")
 * - "shared": ownerField IS NULL (shared items)
 * - "all": no filtering, or excludes partner data based on privacy level
 *
 * @param includeSharedInMine - When true, "mine" mode also includes NULL (shared) records.
 *   Use for entities where NULL means "shared with everyone" and should be visible
 *   in personal view (e.g. categories). Do NOT use for entities where NULL means "unowned"
 *   and belongs in the "shared" view (e.g. accounts, transactions).
 * @param isTransactionFilter - When true and privacy is "unified", filter out partner's
 *   individual records. In unified mode only transaction details are hidden;
 *   accounts, goals, categories etc. remain fully visible.
 * @param paidByField - Column reference to paidByMemberId. When provided in "mine" mode
 *   with all_visible privacy, also includes transactions paid by user for other scopes.
 * @param partnerPrivacy - Partner's privacy level (only needed for "all" mode or paidBy logic).
 */
export function getViewModeCondition(opts: {
  viewMode: ViewMode;
  userMemberId: string;
  ownerField: PgColumn;
  partnerPrivacy?: PrivacyLevel;
  includeSharedInMine?: boolean;
  isTransactionFilter?: boolean;
  paidByField?: PgColumn;
}): SQL | undefined {
  const { viewMode, userMemberId, ownerField, partnerPrivacy, includeSharedInMine, isTransactionFilter, paidByField } = opts;

  switch (viewMode) {
    case "mine": {
      const myScope = includeSharedInMine
        ? or(eq(ownerField, userMemberId), isNull(ownerField))!
        : eq(ownerField, userMemberId);

      // For transactions with all_visible privacy: also show items I paid for others
      if (paidByField && partnerPrivacy === "all_visible") {
        const paidForOthers = and(
          eq(paidByField, userMemberId),
          ne(ownerField, userMemberId),
        )!;
        return or(myScope, paidForOthers)!;
      }

      return myScope;
    }

    case "shared":
      return isNull(ownerField);

    case "all":
      // "private": exclude partner's individual records everywhere
      if (partnerPrivacy === "private") {
        return or(eq(ownerField, userMemberId), isNull(ownerField))!;
      }
      // "unified": only hide partner's individual transactions; everything else visible
      if (partnerPrivacy === "unified" && isTransactionFilter) {
        return or(eq(ownerField, userMemberId), isNull(ownerField))!;
      }
      // "all_visible" or "unified" (non-transaction): no filter, show everything
      return undefined;

    default:
      return or(eq(ownerField, userMemberId), isNull(ownerField))!;
  }
}
