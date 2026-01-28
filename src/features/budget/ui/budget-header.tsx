'use client';

import { MonthSelector } from '@/shared/ui/month-selector';
import { cn } from '@/shared/lib/utils';
import { formatCurrency } from '@/features/budget/types';

interface BudgetHeaderProps {
  year: number;
  month: number;
  onMonthChange: (year: number, month: number) => void;
  totalIncome: number;
  totalAllocated: number;
  totalGoals?: number;
}

/**
 * BudgetHeader - Sticky header with month navigation and allocation summary
 *
 * Features:
 * - Month selector for navigating between months/years
 * - Summary badge showing:
 *   - Green: Fully allocated (unallocated === 0 && income > 0)
 *   - Red: Over-allocated (unallocated < 0)
 *   - Gray: Remaining to allocate (unallocated > 0)
 */
export function BudgetHeader({
  year,
  month,
  onMonthChange,
  totalIncome,
  totalAllocated,
  totalGoals = 0,
}: BudgetHeaderProps) {
  // Goals are included in the total allocated for balance calculation
  const totalAllocatedWithGoals = totalAllocated + totalGoals;
  const unallocated = totalIncome - totalAllocatedWithGoals;

  const getSummaryStyles = () => {
    if (unallocated === 0 && totalIncome > 0) {
      return 'bg-green-100 dark:bg-green-900/30 text-green-700';
    }
    if (unallocated < 0) {
      return 'bg-red-100 dark:bg-red-900/30 text-red-700';
    }
    return 'bg-muted';
  };

  const getSummaryLabel = () => {
    if (unallocated === 0 && totalIncome > 0) {
      return 'Alocado';
    }
    if (unallocated < 0) {
      return 'Excedido';
    }
    return 'Para Alocar';
  };

  return (
    <div className="flex items-center justify-between px-3 sm:px-4 py-2 border-b">
      {/* Summary Badge */}
      <div
        data-tutorial="budget-available"
        className={cn(
          'flex items-center gap-2 px-3 py-1 rounded text-sm',
          getSummaryStyles()
        )}
      >
        <span className="font-bold">{formatCurrency(Math.abs(unallocated))}</span>
        <span className="text-xs">{getSummaryLabel()}</span>
      </div>

      {/* Month Navigation */}
      <MonthSelector
        year={year}
        month={month}
        onChange={onMonthChange}
      />
    </div>
  );
}
