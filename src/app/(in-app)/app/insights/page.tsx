import { serverFetch, buildFallbackMap } from "@/shared/lib/api/server-fetch";
import { ServerPrefetch } from "@/shared/providers/server-prefetch";
import InsightsPageClient from "./client";

/**
 * Insights page — Server Component.
 * Prefetches budgets server-side so the page can immediately
 * start fetching insights data for the current month.
 */
export default async function InsightsPage() {
  const budgets = await serverFetch("/api/app/budgets");

  const fallback = buildFallbackMap([
    ["/api/app/budgets", budgets],
  ]);

  return (
    <ServerPrefetch fallback={fallback}>
      <InsightsPageClient />
    </ServerPrefetch>
  );
}
