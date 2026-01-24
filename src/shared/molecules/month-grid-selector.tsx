'use client';

import { Label } from '@/shared/ui/label';
import { cn } from '@/shared/lib/utils';

const MONTH_NAMES = [
  'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
  'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez',
];

const MONTH_NAMES_FULL = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

interface MonthGridSelectorProps {
  /** Selected month (1-12) */
  value: number | null;
  /** Callback when month is selected */
  onChange: (month: number) => void;
  /** Current month to highlight (1-12) */
  currentMonth?: number;
  /** Show label above the selector. Defaults to true */
  showLabel?: boolean;
  /** Custom label text */
  label?: string;
  disabled?: boolean;
  className?: string;
}

/**
 * MonthGridSelector - Molecule for selecting a month from a 4x3 grid
 *
 * Displays all 12 months in a compact grid layout.
 * Used for:
 * - Yearly recurring expenses (selecting due month)
 * - Date range selection
 * - Budget allocation by month
 *
 * @example
 * ```tsx
 * <MonthGridSelector
 *   value={selectedMonth}
 *   onChange={setSelectedMonth}
 *   currentMonth={new Date().getMonth() + 1}
 *   label="Mês do Vencimento"
 * />
 * ```
 */
export function MonthGridSelector({
  value,
  onChange,
  currentMonth,
  showLabel = true,
  label = 'Mês',
  disabled = false,
  className,
}: MonthGridSelectorProps) {
  return (
    <div className={cn('grid gap-2', className)}>
      {showLabel && <Label>{label}</Label>}
      <div className="grid grid-cols-4 gap-1">
        {MONTH_NAMES.map((month, idx) => {
          const monthNumber = idx + 1;
          const isSelected = value === monthNumber;
          const isCurrent = currentMonth === monthNumber && !isSelected;

          return (
            <button
              key={idx}
              type="button"
              onClick={() => onChange(monthNumber)}
              disabled={disabled}
              className={cn(
                'rounded border py-1.5 text-[10px] font-medium transition-colors',
                isSelected
                  ? 'border-primary bg-primary/5 text-primary'
                  : 'border-muted hover:bg-muted/50',
                isCurrent && 'bg-muted/30',
                disabled && 'opacity-50 cursor-not-allowed'
              )}
            >
              {month}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export { MONTH_NAMES, MONTH_NAMES_FULL };
