import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { InsightsClient } from "@/features/insights/ui/insights-client";

/**
 * Insights page -- Server Component.
 *
 * Authenticates the user server-side, then renders the client component
 * which handles all data fetching via SWR hooks.
 */
export default async function InsightsPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/");
  }

  return <InsightsClient />;
}
