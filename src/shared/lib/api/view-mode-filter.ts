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
 * - "all": no filtering, or excludes partner data when privacy = "private" or "totals_only"
 *
 * @param includeSharedInMine - When true, "mine" mode also includes NULL (shared) records.
 *   Use for entities where NULL means "shared with everyone" and should be visible
 *   in personal view (e.g. categories). Do NOT use for entities where NULL means "unowned"
 *   and belongs in the "shared" view (e.g. accounts, transactions).
 */
export function getViewModeCondition(opts: {
  viewMode: ViewMode;
  userMemberId: string;
  ownerField: PgColumn;
  partnerPrivacy?: PrivacyLevel;
  includeSharedInMine?: boolean;
}): SQL | undefined {
  const { viewMode, userMemberId, ownerField, partnerPrivacy, includeSharedInMine } = opts;

  switch (viewMode) {
    case "mine":
      return includeSharedInMine
        ? or(eq(ownerField, userMemberId), isNull(ownerField))!
        : eq(ownerField, userMemberId);

    case "shared":
      return isNull(ownerField);

    case "all":
      // "private" or "totals_only": exclude partner's individual records (own + shared only)
      // For "totals_only", partner aggregate totals are handled separately per-endpoint
      if (partnerPrivacy === "private" || partnerPrivacy === "totals_only") {
        return or(eq(ownerField, userMemberId), isNull(ownerField))!;
      }
      // "all_visible": no filter, show everything
      return undefined;

    default:
      return or(eq(ownerField, userMemberId), isNull(ownerField))!;
  }
}
