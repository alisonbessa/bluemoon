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
 * - "mine": ownerField = userMemberId (personal items)
 * - "shared": ownerField IS NULL (shared items)
 * - "all": no filtering (or excludes partner data when privacy = "private")
 */
export function getViewModeCondition(opts: {
  viewMode: ViewMode;
  userMemberId: string;
  ownerField: PgColumn;
  partnerPrivacy?: PrivacyLevel;
}): SQL | undefined {
  const { viewMode, userMemberId, ownerField, partnerPrivacy } = opts;

  switch (viewMode) {
    case "mine":
      return eq(ownerField, userMemberId);

    case "shared":
      return isNull(ownerField);

    case "all":
      // If partner set privacy to "private", only show own + shared (exclude partner personal data)
      if (partnerPrivacy === "private") {
        return or(eq(ownerField, userMemberId), isNull(ownerField));
      }
      // "all_visible" or "totals_only" — return all data (totals_only is handled at the presentation layer)
      return undefined;

    default:
      return or(eq(ownerField, userMemberId), isNull(ownerField));
  }
}
