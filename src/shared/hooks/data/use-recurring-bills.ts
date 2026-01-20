'use client';

import useSWR from 'swr';
import { optimisticMutate } from '@/shared/lib/swr/optimistic';

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

const BILLS_BASE_KEY = '/api/app/recurring-bills';

/**
 * Hook for fetching and caching recurring bills data
 * Uses SWR for automatic caching and deduplication
 * Includes optimistic mutation methods
 */
export function useRecurringBills(categoryId?: string) {
  const key = categoryId
    ? `${BILLS_BASE_KEY}?categoryId=${categoryId}`
    : BILLS_BASE_KEY;

  const { data, error, isLoading, mutate } = useSWR<RecurringBillsResponse>(key);

  const bills = data?.recurringBills ?? [];

  /**
   * Create a new recurring bill with optimistic update
   */
  const createBill = async (
    newBill: Omit<RecurringBill, 'id' | 'createdAt' | 'updatedAt' | 'isActive' | 'displayOrder'>
  ) => {
    const tempId = `temp-${Date.now()}`;
    const optimisticBill: RecurringBill = {
      ...newBill,
      id: tempId,
      isActive: true,
      displayOrder: bills.length,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    return optimisticMutate<RecurringBillsResponse>({
      key,
      optimisticUpdate: (current) => ({
        recurringBills: [...(current?.recurringBills ?? []), optimisticBill],
      }),
      action: async () => {
        const response = await fetch(BILLS_BASE_KEY, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newBill),
        });
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Erro ao criar conta recorrente');
        }
      },
      successMessage: 'Conta adicionada!',
    });
  };

  /**
   * Update a recurring bill with optimistic update
   */
  const updateBill = async (
    id: string,
    updates: Partial<RecurringBill>
  ) => {
    return optimisticMutate<RecurringBillsResponse>({
      key,
      optimisticUpdate: (current) => ({
        recurringBills: (current?.recurringBills ?? []).map((bill) =>
          bill.id === id ? { ...bill, ...updates } : bill
        ),
      }),
      action: async () => {
        const response = await fetch(`${BILLS_BASE_KEY}/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates),
        });
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Erro ao atualizar conta');
        }
      },
      successMessage: 'Conta atualizada!',
    });
  };

  /**
   * Delete a recurring bill with optimistic update
   */
  const deleteBill = async (id: string) => {
    return optimisticMutate<RecurringBillsResponse>({
      key,
      optimisticUpdate: (current) => ({
        recurringBills: (current?.recurringBills ?? []).filter((bill) => bill.id !== id),
      }),
      action: async () => {
        const response = await fetch(`${BILLS_BASE_KEY}/${id}`, {
          method: 'DELETE',
        });
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Erro ao excluir conta');
        }
      },
      successMessage: 'Conta excluída!',
    });
  };

  return {
    bills,
    isLoading,
    error,
    mutate,
    // Optimistic mutations
    createBill,
    updateBill,
    deleteBill,
  };
}

/**
 * Get recurring bills for a specific category
 */
export function useCategoryRecurringBills(categoryId: string) {
  return useRecurringBills(categoryId);
}

export type { RecurringBill };
