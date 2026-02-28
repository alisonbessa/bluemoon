import { eq, isNull, or, type SQL } from "drizzle-orm";
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
 */
export function getViewModeCondition(opts: {
  viewMode: ViewMode;
  userMemberId: string;
  ownerField: PgColumn;
  partnerPrivacy?: PrivacyLevel;
  includeSharedInMine?: boolean;
  isTransactionFilter?: boolean;
}): SQL | undefined {
  const { viewMode, userMemberId, ownerField, partnerPrivacy, includeSharedInMine, isTransactionFilter } = opts;

  switch (viewMode) {
    case "mine":
      return includeSharedInMine
        ? or(eq(ownerField, userMemberId), isNull(ownerField))!
        : eq(ownerField, userMemberId);

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
