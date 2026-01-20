"use client";

import { useState, useEffect, useCallback } from "react";
import { getWeek } from "date-fns";
import { toast } from "sonner";
import { type PeriodValue } from "@/shared/ui/period-navigator";
import type { Transaction, Category, Account, IncomeSource, Budget } from "../types";

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

  // Period state
  const [periodValue, setPeriodValue] = useState<PeriodValue>({
    year: today.getFullYear(),
    month: today.getMonth() + 1,
    week: getWeek(today, { weekStartsOn: 1, firstWeekContainsDate: 4 }),
  });

  // Data states
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [incomeSources, setIncomeSources] = useState<IncomeSource[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Widget refresh key
  const [widgetRefreshKey, setWidgetRefreshKey] = useState(0);

  const handlePeriodChange = useCallback((value: PeriodValue) => {
    setPeriodValue(value);
  }, []);

  const triggerWidgetRefresh = useCallback(() => {
    setWidgetRefreshKey((k) => k + 1);
  }, []);

  const fetchData = useCallback(async () => {
    // Calculate monthly date range
    const startDate = new Date(periodValue.year, periodValue.month - 1, 1);
    const endDate = new Date(periodValue.year, periodValue.month, 0, 23, 59, 59);

    try {
      const [transactionsRes, categoriesRes, accountsRes, budgetsRes, incomeSourcesRes] =
        await Promise.all([
          fetch(
            `/api/app/transactions?limit=500&startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`
          ),
          fetch("/api/app/categories"),
          fetch("/api/app/accounts"),
          fetch("/api/app/budgets"),
          fetch("/api/app/income-sources"),
        ]);

      if (transactionsRes.ok) {
        const data = await transactionsRes.json();
        setTransactions(data.transactions || []);
      }

      if (categoriesRes.ok) {
        const data = await categoriesRes.json();
        setCategories(data.flatCategories || []);
      }

      if (accountsRes.ok) {
        const data = await accountsRes.json();
        setAccounts(data.accounts || []);
      }

      if (budgetsRes.ok) {
        const data = await budgetsRes.json();
        setBudgets(data.budgets || []);
      }

      if (incomeSourcesRes.ok) {
        const data = await incomeSourcesRes.json();
        setIncomeSources(data.incomeSources || []);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Erro ao carregar dados");
    } finally {
      setIsLoading(false);
    }
  }, [periodValue]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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
