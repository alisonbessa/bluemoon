'use client';

import useSWR from 'swr';
import { useViewMode } from '@/shared/providers/view-mode-provider';
import type {
  Budget,
  MonthSummary,
  Commitment,
  Goal,
  DailyChartData,
  MonthlyChartData,
  CreditCard,
  DashboardViewMode,
} from '../types';

interface BudgetsResponse {
  budgets: Budget[];
}

interface AllocationsResponse {
  income?: { totals: { planned: number; contributionPlanned: number; received: number } };
  totals?: { allocated: number; spent: number };
  hasContributionModel?: boolean;
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
 * Hook for fetching all dashboard data with SWR caching.
 * Includes viewMode in all API URLs so SWR re-fetches when the view changes.
 */
export function useDashboardData(year: number, month: number) {
  const { viewMode, isDuoPlan } = useViewMode();
  const today = new Date();
  const isCurrentOrFutureMonth =
    year > today.getFullYear() ||
    (year === today.getFullYear() && month >= today.getMonth() + 1);

  // Only append viewMode for Duo plans
  const vm = isDuoPlan ? `&viewMode=${viewMode}` : '';

  // Fetch budgets (not filtered by viewMode — budgets are always the same)
  const { data: budgetsData, isLoading: budgetsLoading } = useSWR<BudgetsResponse>(
    '/api/app/budgets'
  );
  const budgets = budgetsData?.budgets ?? [];
  const primaryBudgetId = budgets[0]?.id ?? null;

  // Fetch allocations (depends on budget)
  const allocationsKey = primaryBudgetId
    ? `/api/app/allocations?budgetId=${primaryBudgetId}&year=${year}&month=${month}${vm}`
    : null;

  const { data: allocationsData, isLoading: allocationsLoading } =
    useSWR<AllocationsResponse>(allocationsKey);

  const hasContributionModel = allocationsData?.hasContributionModel ?? false;

  // Calculate month summary from allocations
  const monthSummary: MonthSummary | null = allocationsData
    ? {
        income: allocationsData.income?.totals ?? { planned: 0, received: 0 },
        contribution: {
          planned: allocationsData.income?.totals?.contributionPlanned ?? allocationsData.income?.totals?.planned ?? 0,
        },
        expenses: allocationsData.totals ?? { allocated: 0, spent: 0 },
        available:
          (allocationsData.income?.totals?.planned ?? 0) -
          (allocationsData.totals?.allocated ?? 0),
        hasContributionModel,
      }
    : null;

  // Fetch commitments (only for current/future months)
  const commitmentsKey =
    primaryBudgetId && isCurrentOrFutureMonth
      ? `/api/app/commitments?budgetId=${primaryBudgetId}&days=30&year=${year}&month=${month}${vm}`
      : null;

  const { data: commitmentsData, isLoading: commitmentsLoading } =
    useSWR<CommitmentsResponse>(commitmentsKey);

  // Fetch goals
  const goalsKey = primaryBudgetId
    ? `/api/app/goals?budgetId=${primaryBudgetId}${vm}`
    : null;

  const { data: goalsData, isLoading: goalsLoading } = useSWR<GoalsResponse>(goalsKey);

  // Fetch dashboard stats (charts, credit cards)
  const statsKey = primaryBudgetId
    ? `/api/app/dashboard/stats?budgetId=${primaryBudgetId}&year=${year}&month=${month}${vm}`
    : null;

  const { data: statsData, isLoading: statsLoading } = useSWR<StatsResponse>(statsKey);

  // Progressive loading: only block on essential data (budgets + summary)
  // Goals, scheduled transactions, and charts load independently
  const isLoading = budgetsLoading || allocationsLoading;

  return {
    // Data
    budgets,
    primaryBudgetId,
    monthSummary,
    hasContributionModel,
    commitments: commitmentsData?.commitments ?? [],
    goals: goalsData?.goals ?? [],
    dailyChartData: statsData?.dailyChartData ?? [],
    monthlyChartData: statsData?.monthlyComparison ?? [],
    creditCards: statsData?.creditCards ?? [],
    // Loading states (progressive: each section loads independently)
    isLoading,
    chartsLoading: statsLoading,
    goalsLoading,
    commitmentsLoading,
    // View mode info
    viewMode,
    isDuoPlan,
  };
}
