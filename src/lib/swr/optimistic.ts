import { mutate } from 'swr';
import { toast } from 'sonner';

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
}

/**
 * Perform an optimistic mutation with automatic rollback on error
 *
 * @example
 * await optimisticMutate({
 *   key: '/api/app/accounts',
 *   optimisticUpdate: (current) => ({
 *     ...current,
 *     accounts: [...current.accounts, newAccount]
 *   }),
 *   action: async () => {
 *     await fetch('/api/app/accounts', { method: 'POST', body: JSON.stringify(data) });
 *   },
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

    // 3. Revalidate to ensure consistency with server
    await mutate(key);

    // 4. Show success message
    if (successMessage) {
      toast.success(successMessage);
    }

    onSuccess?.();
    return true;
  } catch (error) {
    // 5. Rollback on error
    await mutate<T>(key, previousData, { revalidate: false });

    // 6. Show error message
    const message = errorMessage ||
      (error instanceof Error ? error.message : 'Ocorreu um erro');
    toast.error(message);

    onError?.(error instanceof Error ? error : new Error(message));
    return false;
  }
}

/**
 * Helper to create an optimistic add operation
 */
export function createOptimisticAdd<T, R>(
  key: string,
  getItems: (response: R) => T[],
  setItems: (response: R, items: T[]) => R
) {
  return async (
    newItem: T,
    action: () => Promise<void>,
    successMessage?: string
  ) => {
    return optimisticMutate<R>({
      key,
      optimisticUpdate: (current) => {
        if (!current) return current as R;
        const items = getItems(current);
        return setItems(current, [...items, newItem]);
      },
      action,
      successMessage,
    });
  };
}

/**
 * Helper to create an optimistic update operation
 */
export function createOptimisticUpdate<T extends { id: string }, R>(
  key: string,
  getItems: (response: R) => T[],
  setItems: (response: R, items: T[]) => R
) {
  return async (
    id: string,
    updates: Partial<T>,
    action: () => Promise<void>,
    successMessage?: string
  ) => {
    return optimisticMutate<R>({
      key,
      optimisticUpdate: (current) => {
        if (!current) return current as R;
        const items = getItems(current);
        const updatedItems = items.map((item) =>
          item.id === id ? { ...item, ...updates } : item
        );
        return setItems(current, updatedItems);
      },
      action,
      successMessage,
    });
  };
}

/**
 * Helper to create an optimistic delete operation
 */
export function createOptimisticDelete<T extends { id: string }, R>(
  key: string,
  getItems: (response: R) => T[],
  setItems: (response: R, items: T[]) => R
) {
  return async (
    id: string,
    action: () => Promise<void>,
    successMessage?: string
  ) => {
    return optimisticMutate<R>({
      key,
      optimisticUpdate: (current) => {
        if (!current) return current as R;
        const items = getItems(current);
        return setItems(current, items.filter((item) => item.id !== id));
      },
      action,
      successMessage,
    });
  };
}
