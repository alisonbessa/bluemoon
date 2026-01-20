'use client';

import { Button } from '@/shared/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { formatCurrency } from '@/shared/lib/formatters';
import { MONTHS_SHORT_PT } from '@/shared/lib/date-utils';
import { cn } from '@/shared/lib/utils';

interface BudgetHeaderProps {
  currentYear: number;
  currentMonth: number;
  totalIncome: number;
  totalAllocated: number;
  onPrevMonth: () => void;
  onNextMonth: () => void;
}

export function BudgetHeader({
  currentYear,
  currentMonth,
  totalIncome,
  totalAllocated,
  onPrevMonth,
  onNextMonth,
}: BudgetHeaderProps) {
  const unallocated = totalIncome - totalAllocated;

  return (
    <div className="flex items-center justify-between px-4 py-2 border-b">
      {/* Month Navigation */}
      <div className="flex items-center">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={onPrevMonth}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm font-semibold min-w-[80px] text-center">
          {MONTHS_SHORT_PT[currentMonth - 1]} {currentYear}
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={onNextMonth}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Summary */}
      <div
        data-tutorial="budget-available"
        className={cn(
          'flex items-center gap-2 px-3 py-1 rounded text-sm',
          unallocated === 0 && totalIncome > 0
            ? 'bg-green-100 dark:bg-green-900/30 text-green-700'
            : unallocated < 0
              ? 'bg-red-100 dark:bg-red-900/30 text-red-700'
              : 'bg-muted'
        )}
      >
        <span className="font-bold">{formatCurrency(Math.abs(unallocated))}</span>
        <span className="text-xs">
          {unallocated === 0 && totalIncome > 0
            ? 'Alocado'
            : unallocated < 0
              ? 'Excedido'
              : 'Para Alocar'}
        </span>
      </div>
    </div>
  );
}
