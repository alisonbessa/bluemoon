import { redirect } from "next/navigation";
import { getSession, getCachedUserAccess } from "@/shared/lib/api/cached-queries";
import { fetchDashboardData } from "@/features/dashboard/server/fetch-dashboard-data";
import { DashboardClient } from "@/features/dashboard/ui/dashboard-client";

/**
 * Dashboard page — Server Component.
 *
 * Fetches all dashboard data server-side so the page renders instantly
 * without a loading spinner. The client component uses SWR with this
 * data as fallback, and refetches when the user changes month/viewMode.
 */
export default async function AppHomepage() {
  const session = await getSession();

  if (!session?.user?.id) {
    redirect("/");
  }

  // Get primary budget ID server-side (cached per request)
  const { primaryBudgetId } = await getCachedUserAccess(session.user.id);

  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth() + 1;

  // Fetch dashboard data server-side (same function used by the API route)
  let initialData = null;
  if (primaryBudgetId) {
    initialData = await fetchDashboardData({
      userId: session.user.id,
      budgetId: primaryBudgetId,
      year,
      month,
      viewMode: "mine", // Default; client will refetch with actual viewMode if different
    });
  }

  return (
    <DashboardClient
      primaryBudgetId={primaryBudgetId}
      initialYear={year}
      initialMonth={month}
      initialData={initialData}
    />
  );
}
