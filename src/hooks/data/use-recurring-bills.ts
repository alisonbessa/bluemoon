'use client';

import useSWR from 'swr';

interface RecurringBill {
  id: string;
  budgetId: string;
  categoryId: string;
  accountId: string | null;
  name: string;
  amount: number;
  frequency: 'weekly' | 'monthly' | 'yearly';
  dueDay: number | null;
  dueMonth: number | null;
  isActive: boolean;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

interface RecurringBillsResponse {
  recurringBills: RecurringBill[];
}

/**
 * Hook for fetching and caching recurring bills data
 * Uses SWR for automatic caching and deduplication
 */
export function useRecurringBills(categoryId?: string) {
  const key = categoryId
    ? `/api/app/recurring-bills?categoryId=${categoryId}`
    : '/api/app/recurring-bills';

  const { data, error, isLoading, mutate } = useSWR<RecurringBillsResponse>(key);

  return {
    bills: data?.recurringBills ?? [],
    isLoading,
    error,
    mutate,
  };
}

/**
 * Get recurring bills for a specific category
 */
export function useCategoryRecurringBills(categoryId: string) {
  return useRecurringBills(categoryId);
}

export type { RecurringBill };
