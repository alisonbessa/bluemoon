import { serverFetch, buildFallbackMap } from "@/shared/lib/api/server-fetch";
import { ServerPrefetch } from "@/shared/providers/server-prefetch";
import IncomePageClient from "./client";

/**
 * Income page — Server Component.
 * Prefetches income sources, budgets, members, and accounts server-side
 * so the page renders instantly without a loading spinner.
 */
export default async function IncomePage() {
  const [incomeSources, budgets, members, accounts, me] = await Promise.all([
    serverFetch("/api/app/income-sources"),
    serverFetch("/api/app/budgets"),
    serverFetch("/api/app/members"),
    serverFetch("/api/app/accounts"),
    serverFetch("/api/app/me"),
  ]);

  const fallback = buildFallbackMap([
    ["/api/app/income-sources", incomeSources],
    ["/api/app/budgets", budgets],
    ["/api/app/members", members],
    ["/api/app/accounts", accounts],
    ["/api/app/me", me],
  ]);

  return (
    <ServerPrefetch fallback={fallback}>
      <IncomePageClient />
    </ServerPrefetch>
  );
}
