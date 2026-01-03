/**
 * useBudgetData Hook
 *
 * Custom hook for managing budget page data and state.
 * Now uses centralized SWR hooks for cached data fetching.
 */

'use client';

import { useState, useCallback, useMemo } from 'react';
import {
  useBudgets,
  useMembers,
  useAccounts,
  useActiveGoals,
  useAllocations,
} from './data';
import type {
  Budget,
  GroupData,
  IncomeData,
  Goal,
} from '@/types';

interface UseBudgetDataReturn {
  // Data
  budgets: Budget[];
  groupsData: GroupData[];
  totals: { allocated: number; spent: number; available: number };
  incomeData: IncomeData | null;
  totalIncome: number;
  goals: Goal[];
  members: ReturnType<typeof useMembers>['members'];
  accounts: ReturnType<typeof useAccounts>['accounts'];

  // State
  isLoading: boolean;
  currentYear: number;
  currentMonth: number;

  // Actions
  setCurrentYear: (year: number) => void;
  setCurrentMonth: (month: number) => void;
  refetch: () => void;
  handlePrevMonth: () => void;
  handleNextMonth: () => void;
}

export function useBudgetData(): UseBudgetDataReturn {
  const today = new Date();
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth() + 1);

  // Use centralized SWR hooks
  const { budgets, isLoading: budgetsLoading, mutate: mutateBudgets } = useBudgets();
  const { members, isLoading: membersLoading, mutate: mutateMembers } = useMembers();
  const { accounts, isLoading: accountsLoading, mutate: mutateAccounts } = useAccounts();
  const { goals, isLoading: goalsLoading, mutate: mutateGoals } = useActiveGoals();
  const {
    groups: groupsData,
    totals,
    income: incomeData,
    isLoading: allocationsLoading,
    mutate: mutateAllocations,
  } = useAllocations(currentYear, currentMonth);

  const isLoading = budgetsLoading || membersLoading || accountsLoading || goalsLoading || allocationsLoading;

  const totalIncome = useMemo(() => {
    return incomeData?.totals?.planned || 0;
  }, [incomeData]);

  const handlePrevMonth = useCallback(() => {
    if (currentMonth === 1) {
      setCurrentYear((y) => y - 1);
      setCurrentMonth(12);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  }, [currentMonth]);

  const handleNextMonth = useCallback(() => {
    if (currentMonth === 12) {
      setCurrentYear((y) => y + 1);
      setCurrentMonth(1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  }, [currentMonth]);

  const refetch = useCallback(() => {
    mutateBudgets();
    mutateMembers();
    mutateAccounts();
    mutateGoals();
    mutateAllocations();
  }, [mutateBudgets, mutateMembers, mutateAccounts, mutateGoals, mutateAllocations]);

  return {
    budgets,
    groupsData,
    totals,
    incomeData,
    totalIncome,
    goals,
    members,
    accounts,
    isLoading,
    currentYear,
    currentMonth,
    setCurrentYear,
    setCurrentMonth,
    refetch,
    handlePrevMonth,
    handleNextMonth,
  };
}
