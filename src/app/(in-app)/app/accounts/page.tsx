import { serverFetch, buildFallbackMap } from "@/shared/lib/api/server-fetch";
import { ServerPrefetch } from "@/shared/providers/server-prefetch";
import AccountsPageClient from "./client";

/**
 * Accounts page — Server Component.
 * Prefetches accounts, budgets, members, and user data server-side
 * so the page renders instantly without a loading spinner.
 */
export default async function AccountsPage() {
  const [accounts, budgets, members, me] = await Promise.all([
    serverFetch("/api/app/accounts"),
    serverFetch("/api/app/budgets"),
    serverFetch("/api/app/members"),
    serverFetch("/api/app/me"),
  ]);

  const fallback = buildFallbackMap([
    ["/api/app/accounts", accounts],
    ["/api/app/budgets", budgets],
    ["/api/app/members", members],
    ["/api/app/me", me],
  ]);

  return (
    <ServerPrefetch fallback={fallback}>
      <AccountsPageClient />
    </ServerPrefetch>
  );
}
