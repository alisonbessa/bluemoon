'use client';

import useSWR from 'swr';
import type {
  Budget,
  MonthSummary,
  Commitment,
  Goal,
  DailyChartData,
  MonthlyChartData,
  CreditCard,
} from '../types';

interface BudgetsResponse {
  budgets: Budget[];
}

interface AllocationsResponse {
  income?: { totals: { planned: number; received: number } };
  totals?: { allocated: number; spent: number };
}

interface CommitmentsResponse {
  commitments: Commitment[];
}

interface GoalsResponse {
  goals: Goal[];
}

interface StatsResponse {
  dailyChartData: DailyChartData[];
  monthlyComparison: MonthlyChartData[];
  creditCards: CreditCard[];
}

/**
 * Hook for fetching all dashboard data with SWR caching
 */
export function useDashboardData(year: number, month: number) {
  const today = new Date();
  const isCurrentOrFutureMonth =
    year > today.getFullYear() ||
    (year === today.getFullYear() && month >= today.getMonth() + 1);

  // Fetch budgets
  const { data: budgetsData, isLoading: budgetsLoading } = useSWR<BudgetsResponse>(
    '/api/app/budgets'
  );
  const budgets = budgetsData?.budgets ?? [];
  const primaryBudgetId = budgets[0]?.id ?? null;

  // Fetch allocations (depends on budget)
  const allocationsKey = primaryBudgetId
    ? `/api/app/allocations?budgetId=${primaryBudgetId}&year=${year}&month=${month}`
    : null;

  const { data: allocationsData, isLoading: allocationsLoading } =
    useSWR<AllocationsResponse>(allocationsKey);

  // Calculate month summary from allocations
  const monthSummary: MonthSummary | null = allocationsData
    ? {
        income: allocationsData.income?.totals ?? { planned: 0, received: 0 },
        expenses: allocationsData.totals ?? { allocated: 0, spent: 0 },
        available:
          (allocationsData.income?.totals?.planned ?? 0) -
          (allocationsData.totals?.allocated ?? 0),
      }
    : null;

  // Fetch commitments (only for current/future months)
  const commitmentsKey =
    primaryBudgetId && isCurrentOrFutureMonth
      ? `/api/app/commitments?budgetId=${primaryBudgetId}&days=30&year=${year}&month=${month}`
      : null;

  const { data: commitmentsData, isLoading: commitmentsLoading } =
    useSWR<CommitmentsResponse>(commitmentsKey);

  // Fetch goals
  const goalsKey = primaryBudgetId ? `/api/app/goals?budgetId=${primaryBudgetId}` : null;

  const { data: goalsData, isLoading: goalsLoading } = useSWR<GoalsResponse>(goalsKey);

  // Fetch dashboard stats (charts, credit cards)
  const statsKey = primaryBudgetId
    ? `/api/app/dashboard/stats?budgetId=${primaryBudgetId}&year=${year}&month=${month}`
    : null;

  const { data: statsData, isLoading: statsLoading } = useSWR<StatsResponse>(statsKey);

  const isLoading =
    budgetsLoading ||
    allocationsLoading ||
    commitmentsLoading ||
    goalsLoading ||
    statsLoading;

  return {
    // Data
    budgets,
    primaryBudgetId,
    monthSummary,
    commitments: commitmentsData?.commitments ?? [],
    goals: goalsData?.goals ?? [],
    dailyChartData: statsData?.dailyChartData ?? [],
    monthlyChartData: statsData?.monthlyComparison ?? [],
    creditCards: statsData?.creditCards ?? [],
    // Loading
    isLoading,
    chartsLoading: statsLoading,
    goalsLoading,
    commitmentsLoading,
  };
}
