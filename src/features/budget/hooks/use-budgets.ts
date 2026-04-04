'use client';

import useSWR from 'swr';
import { useCurrentUser } from '@/shared/hooks/use-current-user';
import type { Budget } from '../types';

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
  const { primaryBudgetId } = useCurrentUser();

  // Use the server-determined primaryBudgetId (from /api/app/me)
  // instead of budgets[0] which may be an old solo budget
  const budget = primaryBudgetId
    ? budgets.find(b => b.id === primaryBudgetId) ?? budgets[0] ?? null
    : budgets[0] ?? null;

  return {
    budget,
    budgetId: budget?.id ?? null,
    isLoading,
    error,
    mutate,
  };
}
