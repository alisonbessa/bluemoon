'use client';

import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { formatCurrencyFromDigits } from '@/shared/lib/formatters';
import type { IncomeSource, IncomeSourceData } from '@/features/income';

interface UseIncomeAllocationFormOptions {
  budgetId: string;
  year: number;
  month: number;
  onSuccess?: () => void;
}

interface UseIncomeAllocationFormReturn {
  // Modal state
  isOpen: boolean;
  incomeSource: IncomeSource | null;
  plannedValue: number;
  defaultAmount: number;

  // Form values
  inputValue: string;
  setInputValue: (value: string) => void;

  // Computed
  isEdited: boolean;

  // Actions
  open: (item: IncomeSourceData) => void;
  close: () => void;
  resetToDefault: () => void;
  save: () => Promise<void>;
  isSaving: boolean;
}

/**
 * Hook for managing income allocation form state and actions
 */
export function useIncomeAllocationForm({
  budgetId,
  year,
  month,
  onSuccess,
}: UseIncomeAllocationFormOptions): UseIncomeAllocationFormReturn {
  // Modal state
  const [editingIncome, setEditingIncome] = useState<IncomeSourceData | null>(null);

  // Form values
  const [inputValue, setInputValue] = useState('');

  // Saving state
  const [isSaving, setIsSaving] = useState(false);

  // Open modal with income source data
  const open = useCallback((item: IncomeSourceData) => {
    setEditingIncome(item);
    setInputValue((item.planned / 100).toFixed(2).replace('.', ','));
  }, []);

  // Close modal
  const close = useCallback(() => {
    setEditingIncome(null);
  }, []);

  // Reset to default amount
  const resetToDefault = useCallback(() => {
    if (editingIncome) {
      setInputValue((editingIncome.defaultAmount / 100).toFixed(2).replace('.', ','));
    }
  }, [editingIncome]);

  // Save allocation
  const save = useCallback(async () => {
    if (!editingIncome || !budgetId) return;

    const cleanValue = inputValue.replace(/[^\d,-]/g, '').replace(',', '.');
    const newValue = Math.round(parseFloat(cleanValue || '0') * 100);

    setIsSaving(true);
    try {
      const response = await fetch('/api/app/income-allocations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          budgetId,
          incomeSourceId: editingIncome.incomeSource.id,
          year,
          month,
          planned: newValue,
        }),
      });

      if (!response.ok) {
        throw new Error('Erro ao atualizar receita');
      }

      toast.success('Receita atualizada!');
      setEditingIncome(null);
      onSuccess?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao salvar');
    } finally {
      setIsSaving(false);
    }
  }, [editingIncome, budgetId, year, month, inputValue, onSuccess]);

  // Check if value has been edited from default
  const isEdited = editingIncome
    ? editingIncome.planned !== editingIncome.defaultAmount
    : false;

  return {
    // Modal state
    isOpen: !!editingIncome,
    incomeSource: editingIncome?.incomeSource ?? null,
    plannedValue: editingIncome?.planned ?? 0,
    defaultAmount: editingIncome?.defaultAmount ?? 0,

    // Form values
    inputValue,
    setInputValue: (value: string) => setInputValue(formatCurrencyFromDigits(value)),

    // Computed
    isEdited,

    // Actions
    open,
    close,
    resetToDefault,
    save,
    isSaving,
  };
}
