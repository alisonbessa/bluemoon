import { mutate } from 'swr';
import { toast } from 'sonner';

/**
 * Invalidate all SWR caches whose keys start with the given prefix.
 * Use after mutations that affect multiple viewMode variants of the same endpoint.
 *
 * @example invalidatePrefix('/api/app/accounts') // clears all viewMode variants
 */
export function invalidatePrefix(prefix: string) {
  return mutate(
    (key) => typeof key === 'string' && key.startsWith(prefix),
    undefined,
    { revalidate: true }
  );
}

interface OptimisticOptions<T> {
  /** SWR cache key */
  key: string;
  /** Function to optimistically update the cache */
  optimisticUpdate: (current: T | undefined) => T;
  /** Async function to perform the actual mutation */
  action: () => Promise<void>;
  /** Success message to show (optional) */
  successMessage?: string;
  /** Error message to show (optional, defaults to error.message) */
  errorMessage?: string;
  /** Callback on success (optional) */
  onSuccess?: () => void;
  /** Callback on error (optional) */
  onError?: (error: Error) => void;
  /**
   * Invalidate all SWR caches with keys starting with this prefix after success.
   * Useful for cross-viewMode invalidation (e.g., creating an account should
   * refresh all /api/app/accounts?viewMode=* caches).
   */
  invalidateKeyPrefix?: string;
}

/**
 * Perform an optimistic mutation using SWR v2 native API.
 *
 * Flow:
 * 1. Optimistically update the cache (instant UI feedback)
 * 2. Execute the server mutation
 * 3. Revalidate to sync with server (auto-rollback on error)
 * 4. Optionally invalidate related caches (cross-key)
 *
 * @example
 * await optimisticMutate({
 *   key: '/api/app/accounts?viewMode=mine',
 *   optimisticUpdate: (current) => ({
 *     accounts: [...(current?.accounts ?? []), newAccount]
 *   }),
 *   action: async () => {
 *     await fetch('/api/app/accounts', { method: 'POST', body: JSON.stringify(data) });
 *   },
 *   invalidateKeyPrefix: '/api/app/accounts',
 *   successMessage: 'Conta criada!',
 * });
 */
export async function optimisticMutate<T>({
  key,
  optimisticUpdate,
  action,
  successMessage,
  errorMessage,
  onSuccess,
  onError,
  invalidateKeyPrefix,
}: OptimisticOptions<T>): Promise<boolean> {
  // Store current data for rollback
  let previousData: T | undefined;

  try {
    // 1. Optimistic update - update cache immediately
    await mutate<T>(
      key,
      (current) => {
        previousData = current;
        return optimisticUpdate(current);
      },
      { revalidate: false }
    );

    // 2. Perform the actual mutation
    await action();

    // 3. Revalidate current key to sync with server
    await mutate(key);

    // 4. Invalidate related caches (e.g., other viewMode variants)
    if (invalidateKeyPrefix) {
      await invalidatePrefix(invalidateKeyPrefix);
    }

    // 5. Show success message
    if (successMessage) {
      toast.success(successMessage);
    }

    onSuccess?.();
    return true;
  } catch (error) {
    // Rollback on error
    await mutate<T>(key, previousData, { revalidate: false });

    const message = errorMessage ||
      (error instanceof Error ? error.message : 'Ocorreu um erro');
    toast.error(message);

    onError?.(error instanceof Error ? error : new Error(message));
    return false;
  }
}
