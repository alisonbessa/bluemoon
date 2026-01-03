'use client';

import useSWR from 'swr';
import type { Goal } from '@/types';

interface GoalsResponse {
  goals: Goal[];
}

/**
 * Hook for fetching and caching goals data
 * Uses SWR for automatic caching and deduplication
 */
export function useGoals() {
  const { data, error, isLoading, mutate } = useSWR<GoalsResponse>(
    '/api/app/goals'
  );

  return {
    goals: data?.goals ?? [],
    isLoading,
    error,
    mutate,
  };
}

/**
 * Get only active (non-completed, non-archived) goals
 */
export function useActiveGoals() {
  const { goals, isLoading, error, mutate } = useGoals();

  return {
    goals: goals.filter((g) => !g.isCompleted && !g.isArchived),
    isLoading,
    error,
    mutate,
  };
}

/**
 * Get completed goals
 */
export function useCompletedGoals() {
  const { goals, isLoading, error, mutate } = useGoals();

  return {
    goals: goals.filter((g) => g.isCompleted),
    isLoading,
    error,
    mutate,
  };
}
