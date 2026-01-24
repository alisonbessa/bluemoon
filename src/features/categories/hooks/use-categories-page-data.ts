'use client';

import useSWR from 'swr';
import type { CategoryGroup } from '../types';

interface Budget {
  id: string;
  name: string;
}

interface CategoriesResponse {
  groups: CategoryGroup[];
}

interface BudgetsResponse {
  budgets: Budget[];
}

export interface CategoriesPageData {
  groups: CategoryGroup[];
  budgets: Budget[];
  totalCategories: number;
  isLoading: boolean;
  error: Error | undefined;
  refresh: () => Promise<void>;
}

/**
 * Hook for fetching all data needed by the categories page
 */
export function useCategoriesPageData(): CategoriesPageData {
  const { data: categoriesData, error: categoriesError, isLoading: categoriesLoading, mutate: mutateCategories } = useSWR<CategoriesResponse>(
    '/api/app/categories'
  );

  const { data: budgetsData, error: budgetsError, isLoading: budgetsLoading } = useSWR<BudgetsResponse>(
    '/api/app/budgets'
  );

  const groups = categoriesData?.groups ?? [];
  const budgets = budgetsData?.budgets ?? [];
  const totalCategories = groups.reduce((sum, g) => sum + g.categories.length, 0);

  const isLoading = categoriesLoading || budgetsLoading;
  const error = categoriesError || budgetsError;

  const refresh = async () => {
    await mutateCategories();
  };

  return {
    groups,
    budgets,
    totalCategories,
    isLoading,
    error,
    refresh,
  };
}
