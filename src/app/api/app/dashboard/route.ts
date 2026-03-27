import withAuthRequired from "@/shared/lib/auth/withAuthRequired";
import { parseViewMode } from "@/shared/lib/api/view-mode-filter";
import { successResponse, errorResponse } from "@/shared/lib/api/responses";
import { fetchDashboardData } from "@/features/dashboard/server/fetch-dashboard-data";

/**
 * Consolidated dashboard endpoint — fetches all dashboard data in a single request.
 * Delegates to fetchDashboardData() which is shared with the Server Component page.
 */
export const GET = withAuthRequired(async (req, context) => {
  const { session } = context;
  const { searchParams } = new URL(req.url);

  const budgetId = searchParams.get("budgetId");
  const year = parseInt(searchParams.get("year") || new Date().getFullYear().toString());
  const month = parseInt(searchParams.get("month") || (new Date().getMonth() + 1).toString());
  const viewMode = parseViewMode(searchParams);

  if (!budgetId) {
    return errorResponse("budgetId is required", 400);
  }

  const result = await fetchDashboardData({
    userId: session.user.id,
    budgetId,
    year,
    month,
    viewMode,
  });

  if (!result) {
    return errorResponse("Budget not found or access denied", 403);
  }

  return successResponse(result);
});
