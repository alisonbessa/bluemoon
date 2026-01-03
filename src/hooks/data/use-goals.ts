'use client';

import useSWR from 'swr';
import type { Goal } from '@/types';
import { optimisticMutate } from '@/lib/swr/optimistic';

interface GoalsResponse {
  goals: Goal[];
}

const GOALS_KEY = '/api/app/goals';

/**
 * Hook for fetching and caching goals data
 * Uses SWR for automatic caching and deduplication
 * Includes optimistic mutation methods
 */
export function useGoals() {
  const { data, error, isLoading, mutate } = useSWR<GoalsResponse>(
    GOALS_KEY
  );

  const goals = data?.goals ?? [];

  /**
   * Archive a goal with optimistic update
   */
  const archiveGoal = async (id: string) => {
    return optimisticMutate<GoalsResponse>({
      key: GOALS_KEY,
      optimisticUpdate: (current) => ({
        goals: (current?.goals ?? []).map((goal) =>
          goal.id === id ? { ...goal, isArchived: true } : goal
        ),
      }),
      action: async () => {
        const response = await fetch(`${GOALS_KEY}/${id}`, {
          method: 'DELETE',
        });
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || 'Erro ao arquivar meta');
        }
      },
      successMessage: 'Meta arquivada!',
    });
  };

  /**
   * Contribute to a goal with optimistic update
   */
  const contributeToGoal = async (
    id: string,
    amount: number,
    year: number,
    month: number,
    fromAccountId: string
  ) => {
    const goal = goals.find((g) => g.id === id);
    if (!goal) return false;

    const newCurrentAmount = goal.currentAmount + amount;
    const newProgress = Math.min(100, Math.round((newCurrentAmount / goal.targetAmount) * 100));
    const willComplete = newCurrentAmount >= goal.targetAmount;

    return optimisticMutate<GoalsResponse>({
      key: GOALS_KEY,
      optimisticUpdate: (current) => ({
        goals: (current?.goals ?? []).map((g) =>
          g.id === id
            ? {
                ...g,
                currentAmount: newCurrentAmount,
                progress: newProgress,
                remaining: Math.max(0, g.targetAmount - newCurrentAmount),
                isCompleted: willComplete,
                completedAt: willComplete ? new Date().toISOString() : g.completedAt,
              }
            : g
        ),
      }),
      action: async () => {
        const response = await fetch(`${GOALS_KEY}/${id}/contribute`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ amount, year, month, fromAccountId }),
        });
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || 'Erro ao contribuir');
        }
      },
      successMessage: willComplete ? '🎉 Parabéns! Meta atingida!' : 'Contribuição registrada!',
    });
  };

  return {
    goals,
    isLoading,
    error,
    mutate,
    // Optimistic mutations
    archiveGoal,
    contributeToGoal,
  };
}

/**
 * Get only active (non-completed, non-archived) goals
 */
export function useActiveGoals() {
  const { goals, isLoading, error, mutate, archiveGoal, contributeToGoal } = useGoals();

  return {
    goals: goals.filter((g) => !g.isCompleted && !g.isArchived),
    isLoading,
    error,
    mutate,
    archiveGoal,
    contributeToGoal,
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
