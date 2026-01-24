'use client';

import { useState, useCallback, useMemo } from 'react';
import { toast } from 'sonner';
import { MONTH_NAMES_PT } from '@/features/budget/types';

type CopyMode = 'all' | 'empty_only';

interface UseBudgetActionsOptions {
  budgetId: string | undefined;
  year: number;
  month: number;
  onSuccess?: () => void;
}

interface UseBudgetActionsReturn {
  // Copy allocations state
  isCopyModalOpen: boolean;
  copyMode: CopyMode | null;
  setCopyMode: (mode: CopyMode | null) => void;
  openCopyModal: () => void;
  closeCopyModal: () => void;

  // Copy actions
  copyFromPreviousMonth: (mode?: CopyMode) => Promise<void>;
  isCopying: boolean;

  // Previous month info
  previousMonth: { year: number; month: number };
  previousMonthName: string;
  currentMonthName: string;
}

/**
 * Hook for managing budget-wide actions
 *
 * Handles:
 * - Copy allocations from previous month
 * - Copy modal state management
 * - Previous/current month calculations
 *
 * @example
 * ```tsx
 * const {
 *   isCopyModalOpen,
 *   copyMode,
 *   setCopyMode,
 *   openCopyModal,
 *   closeCopyModal,
 *   copyFromPreviousMonth,
 *   isCopying,
 *   previousMonthName,
 * } = useBudgetActions({ budgetId, year, month, onSuccess: refreshData });
 * ```
 */
export function useBudgetActions({
  budgetId,
  year,
  month,
  onSuccess,
}: UseBudgetActionsOptions): UseBudgetActionsReturn {
  // Copy modal state
  const [isCopyModalOpen, setIsCopyModalOpen] = useState(false);
  const [copyMode, setCopyMode] = useState<CopyMode | null>(null);
  const [isCopying, setIsCopying] = useState(false);

  // Calculate previous month
  const previousMonth = useMemo(() => {
    if (month === 1) {
      return { year: year - 1, month: 12 };
    }
    return { year, month: month - 1 };
  }, [year, month]);

  // Month names
  const previousMonthName = MONTH_NAMES_PT[previousMonth.month - 1];
  const currentMonthName = MONTH_NAMES_PT[month - 1];

  // Open copy modal
  const openCopyModal = useCallback(() => {
    setIsCopyModalOpen(true);
    setCopyMode(null);
  }, []);

  // Close copy modal
  const closeCopyModal = useCallback(() => {
    setIsCopyModalOpen(false);
    setCopyMode(null);
  }, []);

  // Copy from previous month
  const copyFromPreviousMonth = useCallback(async (mode: CopyMode = 'all') => {
    if (!budgetId) return;

    setIsCopying(true);

    try {
      const response = await fetch('/api/app/allocations/copy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          budgetId,
          fromYear: previousMonth.year,
          fromMonth: previousMonth.month,
          toYear: year,
          toMonth: month,
          mode,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Server indicates that current month has allocations and needs confirmation
        if (data.requiresConfirm) {
          setIsCopyModalOpen(true);
          setCopyMode(null);
          return;
        }
        throw new Error(data.error || 'Erro ao copiar orçamento');
      }

      toast.success(`${data.copiedCount} alocações copiadas de ${previousMonthName}!`);
      closeCopyModal();
      onSuccess?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao copiar orçamento');
    } finally {
      setIsCopying(false);
    }
  }, [budgetId, previousMonth, year, month, previousMonthName, closeCopyModal, onSuccess]);

  return {
    // Copy modal state
    isCopyModalOpen,
    copyMode,
    setCopyMode,
    openCopyModal,
    closeCopyModal,

    // Copy actions
    copyFromPreviousMonth,
    isCopying,

    // Month info
    previousMonth,
    previousMonthName,
    currentMonthName,
  };
}
