import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { checkUserAccess } from "@/shared/lib/users/checkPartnerAccess";
import { fetchAccountsData } from "@/features/accounts/server/fetch-accounts-data";
import { AccountsClient } from "@/features/accounts/ui/accounts-client";

/**
 * Accounts page -- Server Component.
 *
 * Fetches accounts data server-side so the page renders instantly
 * without a loading spinner. The client component uses SWR with this
 * data as fallback, and refetches when the user changes viewMode.
 */
export default async function AccountsPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/");
  }

  const { primaryBudgetId } = await checkUserAccess(session.user.id);

  // Fetch accounts data server-side
  let initialData = null;
  if (primaryBudgetId) {
    initialData = await fetchAccountsData({
      userId: session.user.id,
      budgetId: primaryBudgetId,
      viewMode: "mine", // Default; client will refetch with actual viewMode if different
    });
  }

  return <AccountsClient initialData={initialData} />;
}
