import { cookies, headers } from "next/headers";

/**
 * Server-side fetch utility for prefetching API data in Server Components.
 *
 * Calls internal API routes with the current user's cookies forwarded,
 * so the API route sees the same authenticated session as a client fetch.
 * Results are passed as SWR fallback to eliminate loading spinners on
 * initial page load.
 *
 * Usage in a Server Component page.tsx:
 *   const data = await serverFetch("/api/app/accounts");
 *
 * Or fetch multiple endpoints in parallel:
 *   const [accounts, budgets] = await serverFetchAll([
 *     "/api/app/accounts",
 *     "/api/app/budgets",
 *   ]);
 */

export async function serverFetch<T = unknown>(path: string): Promise<T | null> {
  try {
    const [cookieStore, headersList] = await Promise.all([
      cookies(),
      headers(),
    ]);

    const host = headersList.get("host") || "localhost:3000";
    const proto = headersList.get("x-forwarded-proto") || "http";
    const baseUrl = `${proto}://${host}`;

    const res = await fetch(`${baseUrl}${path}`, {
      headers: {
        cookie: cookieStore.toString(),
      },
      // Don't cache on the server — we want fresh data per request
      cache: "no-store",
    });

    if (!res.ok) return null;
    return res.json() as Promise<T>;
  } catch {
    // Silently fail — the client SWR hooks will refetch
    return null;
  }
}

/**
 * Fetch multiple API endpoints in parallel.
 * Returns an array of results in the same order as the paths.
 */
export async function serverFetchAll<T = unknown>(
  paths: string[]
): Promise<(T | null)[]> {
  return Promise.all(paths.map((path) => serverFetch<T>(path)));
}

/**
 * Build a SWR fallback map from endpoint paths and their prefetched data.
 * Filters out null values (failed fetches).
 */
export function buildFallbackMap(
  entries: [string, unknown | null][]
): Record<string, unknown> {
  const fallback: Record<string, unknown> = {};
  for (const [key, data] of entries) {
    if (data !== null) {
      fallback[key] = data;
    }
  }
  return fallback;
}
