'use client';

import useSWR from 'swr';
import type { IncomeSource, IncomeType } from '../types';

interface Budget {
  id: string;
  name: string;
}

interface Member {
  id: string;
  name: string;
  type: string;
  color?: string | null;
}

interface Account {
  id: string;
  name: string;
  type: string;
  icon?: string | null;
}

interface IncomeSourcesResponse {
  incomeSources: IncomeSource[];
  totalMonthlyIncome: number;
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

export interface IncomePageData {
  budgets: Budget[];
  members: Member[];
  accounts: Account[];
  incomeSources: IncomeSource[];
  totalMonthlyIncome: number;
  incomeByType: Record<IncomeType, IncomeSource[]>;
  typesWithIncome: [IncomeType, IncomeSource[]][];
  isLoading: boolean;
  error: Error | undefined;
  refresh: () => Promise<void>;
}

/**
 * Hook for fetching all data needed by the income page
 * Combines budgets, members, accounts, and income sources
 */
export function useIncomePageData(): IncomePageData {
  const { data: budgetsData, error: budgetsError, isLoading: budgetsLoading } = useSWR<BudgetsResponse>(
    '/api/app/budgets'
  );

  const { data: membersData, error: membersError, isLoading: membersLoading } = useSWR<MembersResponse>(
    '/api/app/members'
  );

  const { data: accountsData, error: accountsError, isLoading: accountsLoading } = useSWR<AccountsResponse>(
    '/api/app/accounts'
  );

  const { data: incomeData, error: incomeError, isLoading: incomeLoading, mutate: mutateIncome } = useSWR<IncomeSourcesResponse>(
    '/api/app/income-sources'
  );

  const budgets = budgetsData?.budgets ?? [];
  const members = membersData?.members ?? [];
  const accounts = accountsData?.accounts ?? [];
  const incomeSources = incomeData?.incomeSources ?? [];
  const totalMonthlyIncome = incomeData?.totalMonthlyIncome ?? 0;

  // Group income sources by type
  const incomeByType: Record<IncomeType, IncomeSource[]> = {
    salary: incomeSources.filter((s) => s.type === 'salary'),
    benefit: incomeSources.filter((s) => s.type === 'benefit'),
    freelance: incomeSources.filter((s) => s.type === 'freelance'),
    rental: incomeSources.filter((s) => s.type === 'rental'),
    investment: incomeSources.filter((s) => s.type === 'investment'),
    other: incomeSources.filter((s) => s.type === 'other'),
  };

  const typesWithIncome = (Object.entries(incomeByType) as [IncomeType, IncomeSource[]][]).filter(
    ([, sources]) => sources.length > 0
  );

  const isLoading = budgetsLoading || membersLoading || accountsLoading || incomeLoading;
  const error = budgetsError || membersError || accountsError || incomeError;

  const refresh = async () => {
    await mutateIncome();
  };

  return {
    budgets,
    members,
    accounts,
    incomeSources,
    totalMonthlyIncome,
    incomeByType,
    typesWithIncome,
    isLoading,
    error,
    refresh,
  };
}
