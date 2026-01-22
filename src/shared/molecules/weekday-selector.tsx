'use client';

import { Label } from '@/shared/ui/label';
import { cn } from '@/shared/lib/utils';

interface WeekdaySelectorProps {
  value: number | null;
  onChange: (value: number) => void;
  disabled?: boolean;
  /** Show label above the selector. Defaults to true */
  showLabel?: boolean;
  /** Custom label text */
  label?: string;
  /** Use short day names (Dom, Seg...) vs full (Domingo, Segunda...) */
  shortNames?: boolean;
  className?: string;
}

const WEEKDAYS = [
  { value: 0, label: 'Domingo', short: 'Dom' },
  { value: 1, label: 'Segunda', short: 'Seg' },
  { value: 2, label: 'Terça', short: 'Ter' },
  { value: 3, label: 'Quarta', short: 'Qua' },
  { value: 4, label: 'Quinta', short: 'Qui' },
  { value: 5, label: 'Sexta', short: 'Sex' },
  { value: 6, label: 'Sábado', short: 'Sáb' },
];

/**
 * WeekdaySelector - Molecule for selecting a day of the week
 *
 * Used for:
 * - Weekly recurring expenses
 * - Weekly income scheduling
 * - Budget allocation frequency
 *
 * @example
 * ```tsx
 * <WeekdaySelector
 *   value={weekday}
 *   onChange={setWeekday}
 *   label="Dia da Semana"
 * />
 * ```
 */
export function WeekdaySelector({
  value,
  onChange,
  disabled = false,
  showLabel = true,
  label = 'Dia da Semana',
  shortNames = true,
  className,
}: WeekdaySelectorProps) {
  return (
    <div className={cn('grid gap-2', className)}>
      {showLabel && <Label>{label}</Label>}
      <div className="grid grid-cols-7 gap-1">
        {WEEKDAYS.map((day) => (
          <button
            key={day.value}
            type="button"
            onClick={() => onChange(day.value)}
            disabled={disabled}
            className={cn(
              'rounded-lg border py-2 text-xs font-medium transition-colors',
              value === day.value
                ? 'border-primary bg-primary/5 text-primary'
                : 'border-muted hover:bg-muted/50',
              disabled && 'opacity-50 cursor-not-allowed'
            )}
          >
            {shortNames ? day.short : day.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export { WEEKDAYS };
