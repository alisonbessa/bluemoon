'use client';

import useSWR from 'swr';
import { useViewMode } from '@/shared/providers/view-mode-provider';
import type { IncomeSource } from '../types';

interface IncomeSourcesResponse {
  incomeSources: IncomeSource[];
}

const BASE_KEY = '/api/app/income-sources';

/**
 * Hook for fetching and caching income sources data
 * Uses SWR for automatic caching and deduplication
 */
export function useIncomeSources() {
  const { viewMode, isDuoPlan } = useViewMode();
  const swrKey = isDuoPlan ? `${BASE_KEY}?viewMode=${viewMode}` : BASE_KEY;

  const { data, error, isLoading, mutate } = useSWR<IncomeSourcesResponse>(swrKey);

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
