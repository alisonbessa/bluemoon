'use client';

import useSWR from 'swr';
import type { GroupData, IncomeData } from '@/types';
import { usePrimaryBudget } from './use-budgets';

interface AllocationsResponse {
  groups: GroupData[];
  totals: {
    allocated: number;
    spent: number;
    available: number;
  };
  income?: IncomeData;
}

/**
 * Hook for fetching and caching allocations data for a specific month
 * Uses SWR for automatic caching and deduplication
 */
export function useAllocations(year: number, month: number) {
  const { budgetId, isLoading: budgetLoading } = usePrimaryBudget();

  const key = budgetId
    ? `/api/app/allocations?budgetId=${budgetId}&year=${year}&month=${month}`
    : null;

  const { data, error, isLoading, mutate } = useSWR<AllocationsResponse>(key);

  return {
    groups: data?.groups ?? [],
    totals: data?.totals ?? { allocated: 0, spent: 0, available: 0 },
    income: data?.income ?? null,
    isLoading: isLoading || budgetLoading,
    error,
    mutate,
  };
}

/**
 * Hook for current month allocations
 */
export function useCurrentMonthAllocations() {
  const now = new Date();
  return useAllocations(now.getFullYear(), now.getMonth() + 1);
}
