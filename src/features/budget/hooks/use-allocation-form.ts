'use client';

import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { formatCurrencyFromDigits } from '@/shared/lib/formatters';

interface Category {
  id: string;
  name: string;
  icon?: string | null;
  behavior: 'set_aside' | 'refill_up';
  plannedAmount: number;
}

interface AllocationFormState {
  category: Category;
  allocated: number;
}

type AllocationFrequency = 'weekly' | 'monthly' | 'yearly' | 'once';

interface UseAllocationFormOptions {
  budgetId: string;
  year: number;
  month: number;
  onSuccess?: () => void;
  onTutorialAction?: (action: string) => void;
}

interface UseAllocationFormReturn {
  // Modal state
  isOpen: boolean;
  category: Category | null;
  currentAllocated: number;

  // Form values
  inputValue: string;
  setInputValue: (value: string) => void;
  behavior: 'set_aside' | 'refill_up';
  setBehavior: (behavior: 'set_aside' | 'refill_up') => void;
  frequency: AllocationFrequency;
  setFrequency: (frequency: AllocationFrequency) => void;
  weekday: number | null;
  setWeekday: (day: number | null) => void;
  dueDay: number | null;
  setDueDay: (day: number | null) => void;
  yearMonth: number | null;
  setYearMonth: (month: number | null) => void;

  // Computed values
  monthlyValue: { value: number; description: string };

  // Actions
  open: (category: Category, allocated: number) => void;
  close: () => void;
  save: () => Promise<void>;
  isSaving: boolean;
}

/**
 * Hook for managing category allocation form state and actions
 */
export function useAllocationForm({
  budgetId,
  year,
  month,
  onSuccess,
  onTutorialAction,
}: UseAllocationFormOptions): UseAllocationFormReturn {
  // Modal state
  const [editingCategory, setEditingCategory] = useState<AllocationFormState | null>(null);

  // Form values
  const [inputValue, setInputValue] = useState('');
  const [behavior, setBehavior] = useState<'set_aside' | 'refill_up'>('refill_up');
  const [frequency, setFrequency] = useState<AllocationFrequency>('monthly');
  const [weekday, setWeekday] = useState<number | null>(null);
  const [dueDay, setDueDay] = useState<number | null>(null);
  const [yearMonth, setYearMonth] = useState<number | null>(null);

  // Saving state
  const [isSaving, setIsSaving] = useState(false);

  // Count weekday occurrences in month
  const countWeekdayInMonth = useCallback((y: number, m: number, wd: number): number => {
    const firstDay = new Date(y, m - 1, 1);
    const lastDay = new Date(y, m, 0);
    const daysInMonth = lastDay.getDate();

    let count = 0;
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(y, m - 1, day);
      if (date.getDay() === wd) count++;
    }
    return count;
  }, []);

  // Calculate monthly value based on frequency
  const getMonthlyValue = useCallback((): { value: number; description: string } => {
    const cleanValue = inputValue.replace(/[^\d,-]/g, '').replace(',', '.');
    const baseValue = Math.round(parseFloat(cleanValue || '0') * 100);

    if (frequency === 'weekly' && weekday !== null) {
      const count = countWeekdayInMonth(year, month, weekday);
      return {
        value: baseValue * count,
        description: `${count}x no mês = R$ ${((baseValue * count) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      };
    }

    if (frequency === 'yearly') {
      if (yearMonth === month) {
        return { value: baseValue, description: 'Valor integral neste mês' };
      }
      return { value: 0, description: 'Sem alocação neste mês (vence em outro)' };
    }

    if (frequency === 'once') {
      return { value: baseValue, description: 'Valor único' };
    }

    return { value: baseValue, description: '' };
  }, [inputValue, frequency, weekday, yearMonth, year, month, countWeekdayInMonth]);

  // Open modal with category data
  const open = useCallback((category: Category, allocated: number) => {
    setEditingCategory({ category, allocated });
    setInputValue((allocated / 100).toFixed(2).replace('.', ','));
    setBehavior(category.behavior);
    setFrequency('monthly');
    setWeekday(null);
    setDueDay(null);
    setYearMonth(null);
  }, []);

  // Close modal
  const close = useCallback(() => {
    setEditingCategory(null);
  }, []);

  // Save allocation
  const save = useCallback(async () => {
    if (!editingCategory || !budgetId) return;

    const cleanValue = inputValue.replace(/[^\d,-]/g, '').replace(',', '.');
    const newValue = Math.round(parseFloat(cleanValue || '0') * 100);

    setIsSaving(true);
    try {
      // Save allocation
      const allocationResponse = await fetch('/api/app/allocations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          budgetId,
          categoryId: editingCategory.category.id,
          year,
          month,
          allocated: newValue,
        }),
      });

      if (!allocationResponse.ok) {
        throw new Error('Erro ao atualizar alocação');
      }

      // Update category behavior if changed
      if (behavior !== editingCategory.category.behavior) {
        const categoryResponse = await fetch(`/api/app/categories/${editingCategory.category.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ behavior }),
        });

        if (!categoryResponse.ok) {
          console.error('Failed to update category:', await categoryResponse.text());
        }
      }

      toast.success('Alocação atualizada!');
      setEditingCategory(null);
      onSuccess?.();

      // Notify tutorial
      onTutorialAction?.('hasAllocations');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao salvar');
    } finally {
      setIsSaving(false);
    }
  }, [editingCategory, budgetId, year, month, inputValue, behavior, onSuccess, onTutorialAction]);

  return {
    // Modal state
    isOpen: !!editingCategory,
    category: editingCategory?.category ?? null,
    currentAllocated: editingCategory?.allocated ?? 0,

    // Form values
    inputValue,
    setInputValue: (value: string) => setInputValue(formatCurrencyFromDigits(value)),
    behavior,
    setBehavior,
    frequency,
    setFrequency,
    weekday,
    setWeekday,
    dueDay,
    setDueDay,
    yearMonth,
    setYearMonth,

    // Computed values
    monthlyValue: getMonthlyValue(),

    // Actions
    open,
    close,
    save,
    isSaving,
  };
}
