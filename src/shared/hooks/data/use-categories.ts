'use client';

import useSWR from 'swr';
import type { CategoryGroup } from '@/types';

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

  return {
    groups: data?.groups ?? [],
    isLoading,
    error,
    mutate,
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
