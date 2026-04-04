'use client';

import useSWR from 'swr';
import { useViewMode } from '@/shared/providers/view-mode-provider';
import { useCurrentUser } from '@/shared/hooks/use-current-user';
import type {
  MonthSummary,
  Commitment,
  Goal,
  DailyChartData,
  MonthlyChartData,
  CreditCard,
} from '../types';

export interface DashboardResponse {
  allocations: {
    income?: { totals: { planned: number; contributionPlanned: number; received: number } };
    totals?: { allocated: number; spent: number; spentPending?: number };
    hasContributionModel?: boolean;
  };
  commitments: Commitment[];
  goals: Goal[];
  stats: {
    dailyChartData: DailyChartData[];
    monthlyComparison: MonthlyChartData[];
    creditCards: CreditCard[];
  };
}

interface UseDashboardDataOptions {
  /** Server-fetched data to use as SWR fallback (avoids loading state on initial render) */
  fallbackData?: DashboardResponse | null;
}

/**
 * Hook for fetching all dashboard data in a single consolidated request.
 * Uses primaryBudgetId from /api/app/me (no extra request needed).
 * Fetches all sections via /api/app/dashboard (1 request instead of 5).
 *
 * When fallbackData is provided (from Server Component), renders instantly
 * without a loading state for the initial month.
 */
export function useDashboardData(
  year: number,
  month: number,
  options?: UseDashboardDataOptions,
) {
  const { viewMode, isDuoPlan } = useViewMode();
  const { primaryBudgetId, isLoading: userLoading } = useCurrentUser();

  // Only append viewMode for Duo plans
  const vm = isDuoPlan ? `&viewMode=${viewMode}` : '';

  // Single consolidated request for all dashboard data
  const dashboardKey = primaryBudgetId
    ? `/api/app/dashboard?budgetId=${primaryBudgetId}&year=${year}&month=${month}${vm}`
    : null;

  const { data, isLoading: dashboardLoading, mutate: mutateDashboard } = useSWR<DashboardResponse>(
    dashboardKey,
    {
      fallbackData: options?.fallbackData ?? undefined,
    },
  );

  const allocationsData = data?.allocations;
  const hasContributionModel = allocationsData?.hasContributionModel ?? false;

  // Calculate month summary from allocations
  const monthSummary: MonthSummary | null = allocationsData
    ? {
        income: allocationsData.income?.totals ?? { planned: 0, received: 0 },
        contribution: {
          planned: allocationsData.income?.totals?.contributionPlanned ?? allocationsData.income?.totals?.planned ?? 0,
        },
        expenses: allocationsData.totals ?? { allocated: 0, spent: 0, spentPending: 0 },
        available:
          (allocationsData.income?.totals?.planned ?? 0) -
          (allocationsData.totals?.allocated ?? 0),
        hasContributionModel,
      }
    : null;

  const isLoading = userLoading || dashboardLoading;

  return {
    // Data
    primaryBudgetId,
    monthSummary,
    hasContributionModel,
    commitments: data?.commitments ?? [],
    goals: data?.goals ?? [],
    dailyChartData: data?.stats?.dailyChartData ?? [],
    monthlyChartData: data?.stats?.monthlyComparison ?? [],
    creditCards: data?.stats?.creditCards ?? [],
    // Loading states — all data arrives together now
    isLoading,
    chartsLoading: dashboardLoading,
    goalsLoading: dashboardLoading,
    commitmentsLoading: dashboardLoading,
    // Mutations
    refreshDashboard: mutateDashboard,
    // View mode info
    viewMode,
    isDuoPlan,
  };
}
