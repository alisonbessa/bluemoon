'use client';

import useSWR from 'swr';
import { useMemo } from 'react';
import { useViewMode } from '@/shared/providers/view-mode-provider';
import type {
  GroupData,
  IncomeData,
  Goal,
  Budget,
} from '../types';
import type { Member } from '@/types/member';
import type { Account } from '@/types/account';

interface AllocationsResponse {
  groups: GroupData[];
  totals: { allocated: number; spent: number; available: number };
  income: IncomeData | null;
  hasPreviousMonthData: boolean;
  hasContributionModel: boolean;
}

interface BudgetsResponse {
  budgets: Budget[];
}

interface MembersResponse {
  members: Member[];
}

interface AccountsResponse {
  accounts: Account[];
}

interface GoalsResponse {
  goals: Goal[];
  privacyMode?: string;
}

/**
 * Consolidated hook for all budget page data
 * Uses SWR for automatic caching and deduplication
 */
export function useBudgetPageData(year: number, month: number) {
  const { viewMode, isDuoPlan } = useViewMode();
  const vm = isDuoPlan ? `&viewMode=${viewMode}` : '';

  // Fetch budgets
  const { data: budgetsData, isLoading: budgetsLoading } = useSWR<BudgetsResponse>(
    '/api/app/budgets'
  );
  const budgets = budgetsData?.budgets ?? [];
  const primaryBudgetId = budgets[0]?.id ?? null;

  // Fetch members
  const { data: membersData, isLoading: membersLoading } = useSWR<MembersResponse>(
    '/api/app/members'
  );
  const members = membersData?.members ?? [];

  // Fetch accounts (filtered by viewMode)
  const { data: accountsData, isLoading: accountsLoading } = useSWR<AccountsResponse>(
    isDuoPlan ? `/api/app/accounts?viewMode=${viewMode}` : '/api/app/accounts'
  );
  const accounts = accountsData?.accounts ?? [];

  // Fetch allocations (only when we have a budget, filtered by viewMode)
  const allocationsKey = primaryBudgetId
    ? `/api/app/allocations?budgetId=${primaryBudgetId}&year=${year}&month=${month}${vm}`
    : null;

  const {
    data: allocationsData,
    isLoading: allocationsLoading,
    mutate: mutateAllocations,
  } = useSWR<AllocationsResponse>(allocationsKey);

  // Fetch goals (only when we have a budget, filtered by viewMode)
  const goalsKey = primaryBudgetId
    ? `/api/app/goals?budgetId=${primaryBudgetId}${vm}`
    : null;

  const {
    data: goalsData,
    isLoading: goalsLoading,
    mutate: mutateGoals,
  } = useSWR<GoalsResponse>(goalsKey);

  // Process data
  const groupsData = allocationsData?.groups ?? [];
  const totals = allocationsData?.totals ?? { allocated: 0, spent: 0, available: 0 };
  const incomeData = allocationsData?.income ?? null;
  const totalIncome = incomeData?.totals?.planned ?? 0;
  const hasPreviousMonthData = allocationsData?.hasPreviousMonthData ?? false;
  const hasContributionModel = allocationsData?.hasContributionModel ?? false;

  // Calculate total contribution from all income sources
  const totalContribution = useMemo(() => {
    if (!incomeData) return 0;
    return incomeData.byMember.reduce(
      (sum, m) => sum + m.totals.contributionPlanned,
      0
    );
  }, [incomeData]);
  // Server already filters goals based on privacyMode (private/totals_only)
  const goals = useMemo(
    () => goalsData?.goals?.filter((g) => !g.isCompleted) ?? [],
    [goalsData?.goals]
  );

  // Calculate total monthly goals allocation
  const totalGoals = useMemo(
    () => goals.reduce((sum, goal) => sum + (goal.monthlyTarget || 0), 0),
    [goals]
  );

  const isLoading = budgetsLoading || membersLoading || accountsLoading || allocationsLoading || goalsLoading;

  // Refresh all data
  const refreshData = async () => {
    await Promise.all([
      mutateAllocations(),
      mutateGoals(),
    ]);
  };

  return {
    // Data
    budgets,
    primaryBudgetId,
    members,
    accounts,
    groupsData,
    totals,
    incomeData,
    totalIncome,
    totalContribution,
    hasContributionModel,
    totalGoals,
    hasPreviousMonthData,
    goals,
    // Loading state
    isLoading,
    // Mutations
    refreshData,
    mutateAllocations,
    mutateGoals,
  };
}
