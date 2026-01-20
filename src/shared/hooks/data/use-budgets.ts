'use client';

import useSWR from 'swr';
import type { Budget } from '@/types';

interface BudgetsResponse {
  budgets: Budget[];
}

/**
 * Hook for fetching and caching budgets data
 * Uses SWR for automatic caching and deduplication
 */
export function useBudgets() {
  const { data, error, isLoading, mutate } = useSWR<BudgetsResponse>(
    '/api/app/budgets'
  );

  return {
    budgets: data?.budgets ?? [],
    isLoading,
    error,
    mutate,
  };
}

/**
 * Get the first (primary) budget
 * Most users have only one budget
 */
export function usePrimaryBudget() {
  const { budgets, isLoading, error, mutate } = useBudgets();

  return {
    budget: budgets[0] ?? null,
    budgetId: budgets[0]?.id ?? null,
    isLoading,
    error,
    mutate,
  };
}
