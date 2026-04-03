"use client";

import { useState, useCallback } from "react";
import useSWR from "swr";
import { getWeek } from "date-fns";
import { toast } from "sonner";
import { type PeriodValue } from "@/shared/ui/period-navigator";
import { useViewMode } from "@/shared/providers/view-mode-provider";
import type { Transaction, Category, Account, IncomeSource, Budget } from "../types";

export interface TransactionsResponse {
  transactions: Transaction[];
}

interface UseTransactionDataOptions {
  /** Server-fetched data to use as SWR fallback (avoids loading state on initial render) */
  fallbackData?: TransactionsResponse | null;
  /** Initial year (from server component) */
  initialYear?: number;
  /** Initial month (from server component) */
  initialMonth?: number;
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
  fetchData: () => void;
  // Widget refresh
  widgetRefreshKey: number;
  triggerWidgetRefresh: () => void;
}

export function useTransactionData(
  options?: UseTransactionDataOptions,
): UseTransactionDataReturn {
  const today = new Date();
  const { viewMode, isDuoPlan } = useViewMode();
  const vm = isDuoPlan ? `&viewMode=${viewMode}` : "";

  // Period state
  const [periodValue, setPeriodValue] = useState<PeriodValue>({
    year: options?.initialYear ?? today.getFullYear(),
    month: options?.initialMonth ?? today.getMonth() + 1,
    week: getWeek(today, { weekStartsOn: 1, firstWeekContainsDate: 4 }),
  });

  // Widget refresh key
  const [widgetRefreshKey, setWidgetRefreshKey] = useState(0);

  const handlePeriodChange = useCallback((value: PeriodValue) => {
    setPeriodValue(value);
  }, []);

  const triggerWidgetRefresh = useCallback(() => {
    setWidgetRefreshKey((k) => k + 1);
  }, []);

  // Build SWR key for transactions
  const startDate = new Date(periodValue.year, periodValue.month - 1, 1);
  const endDate = new Date(periodValue.year, periodValue.month, 0, 23, 59, 59);
  const transactionsKey = `/api/app/transactions?limit=500&startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}${vm}`;

  // Determine if we should use fallback (only for the initial period)
  const isInitialPeriod =
    options?.initialYear === periodValue.year &&
    options?.initialMonth === periodValue.month;

  const {
    data: transactionsData,
    isLoading: transactionsLoading,
    mutate: mutateTransactions,
  } = useSWR<TransactionsResponse>(transactionsKey, {
    fallbackData:
      isInitialPeriod && options?.fallbackData
        ? options.fallbackData
        : undefined,
    onError: () => {
      toast.error("Erro ao carregar transações");
    },
  });

  // Supporting data: categories, accounts, budgets, income sources
  // These don't change per-month, so simple SWR calls without fallback
  const { data: categoriesData, isLoading: categoriesLoading } = useSWR<{
    flatCategories: Category[];
  }>("/api/app/categories");

  const { data: accountsData, isLoading: accountsLoading } = useSWR<{
    accounts: Account[];
  }>("/api/app/accounts?viewMode=all");

  const { data: budgetsData, isLoading: budgetsLoading } = useSWR<{
    budgets: Budget[];
  }>("/api/app/budgets");

  const incomeSourcesVm = isDuoPlan ? `?viewMode=${viewMode}` : "";
  const { data: incomeSourcesData, isLoading: incomeSourcesLoading } =
    useSWR<{ incomeSources: IncomeSource[] }>(
      `/api/app/income-sources${incomeSourcesVm}`,
    );

  const fetchData = useCallback(() => {
    mutateTransactions();
  }, [mutateTransactions]);

  const isLoading =
    transactionsLoading ||
    categoriesLoading ||
    accountsLoading ||
    budgetsLoading ||
    incomeSourcesLoading;

  return {
    // Data
    transactions: transactionsData?.transactions ?? [],
    categories: categoriesData?.flatCategories ?? [],
    accounts: accountsData?.accounts ?? [],
    incomeSources: incomeSourcesData?.incomeSources ?? [],
    budgets: budgetsData?.budgets ?? [],
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
