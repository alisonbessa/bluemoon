import { serverFetch, buildFallbackMap } from "@/shared/lib/api/server-fetch";
import { ServerPrefetch } from "@/shared/providers/server-prefetch";
import GoalsPageClient from "./client";

/**
 * Goals page — Server Component.
 * Prefetches goals, budgets, accounts, and members server-side
 * so the page renders instantly without a loading spinner.
 */
export default async function GoalsPage() {
  const [goals, budgets, accounts, members] = await Promise.all([
    serverFetch("/api/app/goals"),
    serverFetch("/api/app/budgets"),
    serverFetch("/api/app/accounts"),
    serverFetch("/api/app/members"),
  ]);

  const fallback = buildFallbackMap([
    ["/api/app/goals", goals],
    ["/api/app/budgets", budgets],
    ["/api/app/accounts", accounts],
    ["/api/app/members", members],
  ]);

  return (
    <ServerPrefetch fallback={fallback}>
      <GoalsPageClient />
    </ServerPrefetch>
  );
}
