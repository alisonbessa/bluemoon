import { useCallback } from "react";
import { mutate } from "swr";

/**
 * Returns a function that invalidates all SWR caches affected by transaction changes.
 *
 * Invalidates:
 *   - /api/app/transactions (transactions list + resumo)
 *   - /api/app/allocations (budget planning - pending/realized/saldo columns)
 *   - /api/app/dashboard (dashboard stats)
 *   - /api/app/accounts (account balances)
 */
export function useTransactionCacheInvalidation() {
  return useCallback(() => {
    mutate(
      (key: unknown) =>
        typeof key === "string" &&
        (key.startsWith("/api/app/transactions") ||
          key.startsWith("/api/app/allocations") ||
          key.startsWith("/api/app/dashboard") ||
          key.startsWith("/api/app/accounts")),
      undefined,
      { revalidate: true }
    );
  }, []);
}
