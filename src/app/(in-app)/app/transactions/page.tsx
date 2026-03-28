import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { checkUserAccess } from "@/shared/lib/users/checkPartnerAccess";
import { fetchTransactionsData } from "@/features/transactions/server/fetch-transactions-data";
import { TransactionsClient } from "@/features/transactions/ui/transactions-client";

/**
 * Transactions page -- Server Component.
 *
 * Fetches transaction data server-side so the page renders instantly
 * without a loading spinner. The client component uses SWR with this
 * data as fallback, and refetches when the user changes month or filters.
 */
export default async function TransactionsPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/");
  }

  const { primaryBudgetId } = await checkUserAccess(session.user.id);

  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth() + 1;

  // Fetch transactions server-side for instant initial render
  let initialData = null;
  if (primaryBudgetId) {
    initialData = await fetchTransactionsData({
      userId: session.user.id,
      budgetId: primaryBudgetId,
      year,
      month,
      viewMode: "mine", // Default; client will refetch with actual viewMode if different
    });
  }

  return (
    <TransactionsClient
      initialYear={year}
      initialMonth={month}
      initialData={initialData}
    />
  );
}
