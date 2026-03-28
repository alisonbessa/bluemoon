'use client';

import useSWR from 'swr';
import type { CategoryGroup } from '../types';
import { invalidatePrefix } from '@/shared/lib/swr/optimistic';

interface CategoriesResponse {
  groups: CategoryGroup[];
}

/**
 * Hook for fetching and caching categories data
 * Uses SWR for automatic caching and deduplication
 */
export function useCategories() {
  const { data, error, isLoading, mutate } = useSWR<CategoriesResponse>(
    '/api/app/categories'
  );

  const refresh = () => invalidatePrefix('/api/app/categories');

  return {
    groups: data?.groups ?? [],
    isLoading,
    error,
    mutate,
    refresh,
  };
}

/**
 * Get flat list of all categories
 */
export function useFlatCategories() {
  const { groups, isLoading, error, mutate } = useCategories();

  const categories = groups.flatMap((g) => g.categories);

  return {
    categories,
    isLoading,
    error,
    mutate,
  };
}
