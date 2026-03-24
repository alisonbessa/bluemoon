import { serverFetch, buildFallbackMap } from "@/shared/lib/api/server-fetch";
import { ServerPrefetch } from "@/shared/providers/server-prefetch";
import CategoriesPageClient from "./client";

/**
 * Categories page — Server Component.
 * Prefetches categories and budgets server-side
 * so the page renders instantly without a loading spinner.
 */
export default async function CategoriesPage() {
  const [categories, budgets] = await Promise.all([
    serverFetch("/api/app/categories"),
    serverFetch("/api/app/budgets"),
  ]);

  const fallback = buildFallbackMap([
    ["/api/app/categories", categories],
    ["/api/app/budgets", budgets],
  ]);

  return (
    <ServerPrefetch fallback={fallback}>
      <CategoriesPageClient />
    </ServerPrefetch>
  );
}
