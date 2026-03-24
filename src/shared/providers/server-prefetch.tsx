"use client";

import { SWRConfig } from "swr";

/**
 * Wraps children with SWR fallback data prefetched on the server.
 *
 * When a Server Component fetches API data and passes it here as `fallback`,
 * all SWR hooks within the children will instantly have data available
 * (no loading spinner). SWR will still revalidate in the background
 * according to its normal rules.
 *
 * This merges with the parent SWRConfig in Providers.tsx — it doesn't
 * override the global fetcher, deduping, or other settings.
 */
export function ServerPrefetch({
  fallback,
  children,
}: {
  fallback: Record<string, unknown>;
  children: React.ReactNode;
}) {
  return <SWRConfig value={{ fallback }}>{children}</SWRConfig>;
}
