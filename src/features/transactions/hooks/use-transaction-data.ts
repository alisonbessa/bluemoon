"use client";

import { useState, useMemo, useCallback } from "react";
import useSWR from "swr";
import { getWeek } from "date-fns";
import { type PeriodValue } from "@/shared/ui/period-navigator";
import { useViewMode } from "@/shared/providers/view-mode-provider";
import type { Transaction, Category, Account, IncomeSource, Budget } from "../types";

interface TransactionsResponse {
  transactions: Transaction[];
}

interface CategoriesResponse {
  flatCategories: Category[];
}

interface AccountsResponse {
  accounts: Account[];
}

interface BudgetsResponse {
  budgets: Budget[];
}

interface IncomeSourcesResponse {
  incomeSources: IncomeSource[];
}

interface UseTransactionDataReturn {
  // Data
  transactions: Transaction[];
  categories: Category[];
  accounts: Account[];
  incomeSources: IncomeSource[];
  budgets: Budget[];
  isLoading: boolean;
  // Period
  periodValue: PeriodValue;
  handlePeriodChange: (value: PeriodValue) => void;
  currentYear: number;
  currentMonth: number;
  // Actions
  fetchData: () => Promise<void>;
  // Widget refresh
  widgetRefreshKey: number;
  triggerWidgetRefresh: () => void;
}

export function useTransactionData(): UseTransactionDataReturn {
  const today = new Date();
  const { viewMode, isDuoPlan } = useViewMode();
  const vmParam = isDuoPlan ? `&viewMode=${viewMode}` : '';
  const vmQuery = isDuoPlan ? `?viewMode=${viewMode}` : '';

  // Period state
  const [periodValue, setPeriodValue] = useState<PeriodValue>({
    year: today.getFullYear(),
    month: today.getMonth() + 1,
    week: getWeek(today, { weekStartsOn: 1, firstWeekContainsDate: 4 }),
  });

  // Widget refresh key
  const [widgetRefreshKey, setWidgetRefreshKey] = useState(0);

  // Date range for transactions
  const startDate = new Date(periodValue.year, periodValue.month - 1, 1).toISOString();
  const endDate = new Date(periodValue.year, periodValue.month, 0, 23, 59, 59).toISOString();

  // SWR hooks — parallel fetching with deduplication and caching
  const { data: transactionsData, mutate: mutateTransactions, isLoading: loadingTx } = useSWR<TransactionsResponse>(
    `/api/app/transactions?limit=500&startDate=${startDate}&endDate=${endDate}${vmParam}`
  );

  const { data: categoriesData, isLoading: loadingCat } = useSWR<CategoriesResponse>(
    '/api/app/categories'
  );

  const { data: accountsData, isLoading: loadingAcc } = useSWR<AccountsResponse>(
    `/api/app/accounts${vmQuery}`
  );

  const { data: budgetsData, isLoading: loadingBud } = useSWR<BudgetsResponse>(
    '/api/app/budgets'
  );

  const { data: incomeSourcesData, isLoading: loadingInc } = useSWR<IncomeSourcesResponse>(
    `/api/app/income-sources${vmQuery}`
  );

  const isLoading = loadingTx || loadingCat || loadingAcc || loadingBud || loadingInc;

  // Stable data references via useMemo
  const transactions = useMemo(() => transactionsData?.transactions ?? [], [transactionsData]);
  const categories = useMemo(() => categoriesData?.flatCategories ?? [], [categoriesData]);
  const accounts = useMemo(() => accountsData?.accounts ?? [], [accountsData]);
  const budgets = useMemo(() => budgetsData?.budgets ?? [], [budgetsData]);
  const incomeSources = useMemo(() => incomeSourcesData?.incomeSources ?? [], [incomeSourcesData]);

  const handlePeriodChange = useCallback((value: PeriodValue) => {
    setPeriodValue(value);
  }, []);

  const triggerWidgetRefresh = useCallback(() => {
    setWidgetRefreshKey((k) => k + 1);
  }, []);

  // fetchData now revalidates SWR cache instead of manual fetch
  const fetchData = useCallback(async () => {
    await mutateTransactions();
  }, [mutateTransactions]);

  return {
    // Data
    transactions,
    categories,
    accounts,
    incomeSources,
    budgets,
    isLoading,
    // Period
    periodValue,
    handlePeriodChange,
    currentYear: periodValue.year,
    currentMonth: periodValue.month,
    // Actions
    fetchData,
    // Widget refresh
    widgetRefreshKey,
    triggerWidgetRefresh,
  };
}
