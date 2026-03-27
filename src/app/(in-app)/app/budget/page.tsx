import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { checkUserAccess } from "@/shared/lib/users/checkPartnerAccess";
import { fetchBudgetAllocationsData } from "@/features/budget/server/fetch-budget-page-data";
import { BudgetPageClient } from "@/features/budget/ui/budget-page-client";

/**
 * Budget page -- Server Component.
 *
 * Fetches allocations data server-side so the page renders instantly
 * without a loading spinner. The client component uses SWR with this
 * data as fallback, and refetches when the user changes month/viewMode.
 */
export default async function BudgetPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/");
  }

  // Get primary budget ID server-side
  const { primaryBudgetId } = await checkUserAccess(session.user.id);

  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth() + 1;

  // Fetch allocations data server-side (same logic as the API route)
  let initialAllocationsData = null;
  if (primaryBudgetId) {
    initialAllocationsData = await fetchBudgetAllocationsData({
      userId: session.user.id,
      budgetId: primaryBudgetId,
      year,
      month,
    });
  }

  return (
    <BudgetPageClient
      initialYear={year}
      initialMonth={month}
      initialAllocationsData={initialAllocationsData}
    />
  );
}
