import withAuthRequired from "@/shared/lib/auth/withAuthRequired";
import { parseViewMode } from "@/shared/lib/api/view-mode-filter";
import { cachedResponse, errorResponse } from "@/shared/lib/api/responses";
import { fetchDashboardData } from "@/features/dashboard/server/fetch-dashboard-data";
import { createPerfTracker } from "@/shared/lib/api/perf";

/**
 * Consolidated dashboard endpoint — fetches all dashboard data in a single request.
 * Delegates to fetchDashboardData() which is shared with the Server Component page.
 * Includes Server-Timing header for performance monitoring in DevTools.
 */
export const GET = withAuthRequired(async (req, context) => {
  const perf = createPerfTracker();
  const { session } = context;
  const { searchParams } = new URL(req.url);

  const budgetId = searchParams.get("budgetId");
  const year = parseInt(searchParams.get("year") || new Date().getFullYear().toString());
  const month = parseInt(searchParams.get("month") || (new Date().getMonth() + 1).toString());
  const viewMode = parseViewMode(searchParams);

  if (!budgetId) {
    return errorResponse("budgetId is required", 400);
  }

  const result = await perf.measure("fetch-dashboard", () =>
    fetchDashboardData({
      userId: session.user.id,
      budgetId,
      year,
      month,
      viewMode,
    })
  );

  if (!result) {
    return errorResponse("Budget not found or access denied", 403);
  }

  return cachedResponse(result, {
    maxAge: 30,
    staleWhileRevalidate: 120,
    serverTiming: perf.headerValue(),
  });
});
