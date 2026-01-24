'use client';

import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { cn } from '@/shared/lib/utils';

interface DayOfMonthInputProps {
  value: number | null | undefined;
  onChange: (value: number | undefined) => void;
  disabled?: boolean;
  /** Show label above the input. Defaults to true */
  showLabel?: boolean;
  /** Custom label text */
  label?: string;
  /** Placeholder text */
  placeholder?: string;
  /** Show error state */
  hasError?: boolean;
  /** HTML id for the input */
  id?: string;
  className?: string;
}

/**
 * DayOfMonthInput - Molecule for selecting a day of the month (1-31)
 *
 * Used for:
 * - Income source payment day
 * - Recurring bill due day
 * - Yearly allocation day
 *
 * @example
 * ```tsx
 * <DayOfMonthInput
 *   value={dayOfMonth}
 *   onChange={setDayOfMonth}
 *   label="Dia do Pagamento"
 * />
 * ```
 */
export function DayOfMonthInput({
  value,
  onChange,
  disabled = false,
  showLabel = true,
  label = 'Dia do Mês',
  placeholder = '1-31',
  hasError = false,
  id = 'dayOfMonth',
  className,
}: DayOfMonthInputProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val === '') {
      onChange(undefined);
    } else {
      const num = parseInt(val, 10);
      if (!isNaN(num) && num >= 1 && num <= 31) {
        onChange(num);
      }
    }
  };

  return (
    <div className={cn('grid gap-2', className)}>
      {showLabel && <Label htmlFor={id}>{label}</Label>}
      <Input
        id={id}
        type="number"
        min="1"
        max="31"
        placeholder={placeholder}
        value={value ?? ''}
        onChange={handleChange}
        disabled={disabled}
        className={hasError ? 'border-destructive' : ''}
      />
    </div>
  );
}
