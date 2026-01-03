'use client';

import useSWR from 'swr';
import type { Account } from '@/components/accounts/types';

interface AccountsResponse {
  accounts: Account[];
}

/**
 * Hook for fetching and caching accounts data
 * Uses SWR for automatic caching and deduplication
 */
export function useAccounts() {
  const { data, error, isLoading, mutate } = useSWR<AccountsResponse>(
    '/api/app/accounts'
  );

  return {
    accounts: data?.accounts ?? [],
    isLoading,
    error,
    mutate,
  };
}

/**
 * Get only active (non-archived) accounts
 */
export function useActiveAccounts() {
  const { accounts, isLoading, error, mutate } = useAccounts();

  return {
    accounts: accounts.filter((a) => !a.isArchived),
    isLoading,
    error,
    mutate,
  };
}
