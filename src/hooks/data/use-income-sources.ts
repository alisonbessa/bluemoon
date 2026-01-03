'use client';

import useSWR from 'swr';
import type { IncomeSource } from '@/types';

interface IncomeSourcesResponse {
  incomeSources: IncomeSource[];
}

/**
 * Hook for fetching and caching income sources data
 * Uses SWR for automatic caching and deduplication
 */
export function useIncomeSources() {
  const { data, error, isLoading, mutate } = useSWR<IncomeSourcesResponse>(
    '/api/app/income-sources'
  );

  return {
    incomeSources: data?.incomeSources ?? [],
    isLoading,
    error,
    mutate,
  };
}

/**
 * Get income sources grouped by member
 */
export function useIncomeSourcesByMember() {
  const { incomeSources, isLoading, error, mutate } = useIncomeSources();

  const byMember = incomeSources.reduce(
    (acc, source) => {
      const memberId = source.memberId ?? 'shared';
      if (!acc[memberId]) {
        acc[memberId] = [];
      }
      acc[memberId].push(source);
      return acc;
    },
    {} as Record<string, IncomeSource[]>
  );

  return {
    byMember,
    isLoading,
    error,
    mutate,
  };
}
