'use client';

import useSWR from 'swr';
import type { Account } from '@/components/accounts/types';
import { optimisticMutate } from '@/shared/lib/swr/optimistic';

interface AccountsResponse {
  accounts: Account[];
}

const ACCOUNTS_KEY = '/api/app/accounts';

/**
 * Hook for fetching and caching accounts data
 * Uses SWR for automatic caching and deduplication
 * Includes optimistic mutation methods
 */
export function useAccounts() {
  const { data, error, isLoading, mutate } = useSWR<AccountsResponse>(
    ACCOUNTS_KEY
  );

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
      key: ACCOUNTS_KEY,
      optimisticUpdate: (current) => ({
        accounts: [...(current?.accounts ?? []), optimisticAccount],
      }),
      action: async () => {
        const response = await fetch(ACCOUNTS_KEY, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newAccount),
        });
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || 'Erro ao criar conta');
        }
      },
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
      key: ACCOUNTS_KEY,
      optimisticUpdate: (current) => ({
        accounts: (current?.accounts ?? []).map((account) =>
          account.id === id ? { ...account, ...updates } : account
        ),
      }),
      action: async () => {
        const response = await fetch(`${ACCOUNTS_KEY}/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates),
        });
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || 'Erro ao atualizar conta');
        }
      },
      successMessage: 'Conta atualizada com sucesso!',
    });
  };

  /**
   * Delete an account with optimistic update
   */
  const deleteAccount = async (id: string) => {
    return optimisticMutate<AccountsResponse>({
      key: ACCOUNTS_KEY,
      optimisticUpdate: (current) => ({
        accounts: (current?.accounts ?? []).filter((account) => account.id !== id),
      }),
      action: async () => {
        const response = await fetch(`${ACCOUNTS_KEY}/${id}`, {
          method: 'DELETE',
        });
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || 'Erro ao excluir conta');
        }
      },
      successMessage: 'Conta excluída com sucesso!',
    });
  };

  return {
    accounts,
    isLoading,
    error,
    mutate,
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
  const { accounts, isLoading, error, mutate, createAccount, updateAccount, deleteAccount } = useAccounts();

  return {
    accounts: accounts.filter((a) => !a.isArchived),
    isLoading,
    error,
    mutate,
    createAccount,
    updateAccount,
    deleteAccount,
  };
}
