/**
 * useBudgetData Hook
 *
 * Custom hook for managing budget page data and state.
 * Separates data fetching logic from UI components.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { budgetService } from '@/services/budget.service';
import type {
  Budget,
  GroupData,
  IncomeData,
  Goal,
  MemberSummary,
} from '@/types';
import type { Account } from '@/types/account';

interface UseBudgetDataReturn {
  // Data
  budgets: Budget[];
  groupsData: GroupData[];
  totals: { allocated: number; spent: number; available: number };
  incomeData: IncomeData | null;
  totalIncome: number;
  goals: Goal[];
  members: MemberSummary[];
  accounts: Account[];

  // State
  isLoading: boolean;
  currentYear: number;
  currentMonth: number;

  // Actions
  setCurrentYear: (year: number) => void;
  setCurrentMonth: (month: number) => void;
  refetch: () => Promise<void>;
  handlePrevMonth: () => void;
  handleNextMonth: () => void;
}

export function useBudgetData(): UseBudgetDataReturn {
  const today = new Date();
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [groupsData, setGroupsData] = useState<GroupData[]>([]);
  const [totals, setTotals] = useState({ allocated: 0, spent: 0, available: 0 });
  const [incomeData, setIncomeData] = useState<IncomeData | null>(null);
  const [totalIncome, setTotalIncome] = useState(0);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [members, setMembers] = useState<MemberSummary[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth() + 1);

  const fetchData = useCallback(async () => {
    try {
      const [budgetsRes, membersRes, accountsRes] = await Promise.all([
        budgetService.getBudgets(),
        budgetService.getMembers(),
        budgetService.getAccounts(),
      ]);

      setMembers(membersRes.members || []);
      setAccounts(accountsRes.accounts as Account[] || []);
      setBudgets(budgetsRes.budgets || []);

      if (budgetsRes.budgets?.length > 0) {
        const [allocData, goalsData] = await Promise.all([
          budgetService.getAllocations(
            budgetsRes.budgets[0].id,
            currentYear,
            currentMonth
          ),
          budgetService.getGoals(budgetsRes.budgets[0].id),
        ]);

        setGroupsData(allocData.groups || []);
        setTotals(allocData.totals || { allocated: 0, spent: 0, available: 0 });

        if (allocData.income) {
          setIncomeData(allocData.income);
          setTotalIncome(allocData.income.totals.planned || 0);
        }

        setGoals(goalsData.goals?.filter((g: Goal) => !g.isCompleted) || []);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setIsLoading(false);
    }
  }, [currentYear, currentMonth]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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
    refetch: fetchData,
    handlePrevMonth,
    handleNextMonth,
  };
}
