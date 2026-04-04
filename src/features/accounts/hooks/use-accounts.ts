'use client';

import useSWR from 'swr';
import { useViewMode } from '@/shared/providers/view-mode-provider';
import type { Account } from '../types';
import { optimisticMutate, invalidatePrefix } from '@/shared/lib/swr/optimistic';

export interface AccountsResponse {
  accounts: Account[];
}

const BASE_KEY = '/api/app/accounts';

interface UseAccountsOptions {
  /** Server-fetched data to use as SWR fallback (avoids loading state on initial render) */
  fallbackData?: AccountsResponse;
}

/**
 * Hook for fetching and caching accounts data
 * Uses SWR for automatic caching and deduplication
 * Includes optimistic mutation methods
 * SWR key includes viewMode so data re-fetches on view change
 *
 * When fallbackData is provided (from Server Component), renders instantly
 * without a loading state for the initial view mode.
 */
export function useAccounts(options?: UseAccountsOptions) {
  const { viewMode, isDuoPlan } = useViewMode();
  // Always fetch ALL accounts so the client-side toggle works
  const swrKey = `${BASE_KEY}?viewMode=all`;

  const { data, error, isLoading, mutate } = useSWR<AccountsResponse>(swrKey, {
    fallbackData: options?.fallbackData,
  });

  const accounts = data?.accounts ?? [];

  /**
   * Create a new account with optimistic update
   */
  const createAccount = async (
    newAccount: Omit<Account, 'id' | 'createdAt' | 'updatedAt'> & { budgetId: string }
  ) => {
    const tempId = `temp-${Date.now()}`;
    const optimisticAccount: Account = {
      ...newAccount,
      id: tempId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    return optimisticMutate<AccountsResponse>({
      key: swrKey,
      optimisticUpdate: (current) => ({
        accounts: [...(current?.accounts ?? []), optimisticAccount],
      }),
      action: async () => {
        const response = await fetch(BASE_KEY, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newAccount),
        });
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || 'Erro ao criar conta');
        }
      },
      invalidateKeyPrefix: BASE_KEY,
      successMessage: 'Conta criada com sucesso!',
    });
  };

  /**
   * Update an account with optimistic update
   */
  const updateAccount = async (
    id: string,
    updates: Partial<Account>
  ) => {
    return optimisticMutate<AccountsResponse>({
      key: swrKey,
      optimisticUpdate: (current) => ({
        accounts: (current?.accounts ?? []).map((account) =>
          account.id === id ? { ...account, ...updates } : account
        ),
      }),
      action: async () => {
        const response = await fetch(`${BASE_KEY}/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates),
        });
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || 'Erro ao atualizar conta');
        }
      },
      invalidateKeyPrefix: BASE_KEY,
      successMessage: 'Conta atualizada com sucesso!',
    });
  };

  /**
   * Delete an account with optimistic update
   */
  const deleteAccount = async (id: string) => {
    return optimisticMutate<AccountsResponse>({
      key: swrKey,
      optimisticUpdate: (current) => ({
        accounts: (current?.accounts ?? []).filter((account) => account.id !== id),
      }),
      action: async () => {
        const response = await fetch(`${BASE_KEY}/${id}`, {
          method: 'DELETE',
        });
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || 'Erro ao excluir conta');
        }
      },
      invalidateKeyPrefix: BASE_KEY,
      successMessage: 'Conta excluída com sucesso!',
    });
  };

  /** Revalidate all account caches (all viewMode variants) */
  const refresh = () => invalidatePrefix(BASE_KEY);

  return {
    accounts,
    isLoading,
    error,
    mutate,
    refresh,
    viewMode,
    isDuoPlan,
    // Optimistic mutations
    createAccount,
    updateAccount,
    deleteAccount,
  };
}

/**
 * Get only active (non-archived) accounts
 */
export function useActiveAccounts() {
  const { accounts, isLoading, error, mutate, viewMode, isDuoPlan, createAccount, updateAccount, deleteAccount } = useAccounts();

  return {
    accounts: accounts.filter((a) => !a.isArchived),
    isLoading,
    error,
    mutate,
    viewMode,
    isDuoPlan,
    createAccount,
    updateAccount,
    deleteAccount,
  };
}
