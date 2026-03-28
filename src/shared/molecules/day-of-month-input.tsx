'use client';

import { Label } from '@/shared/ui/label';
import { DayPicker } from '@/shared/ui/day-picker';
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

export function DayOfMonthInput({
  value,
  onChange,
  disabled = false,
  showLabel = true,
  label = 'Dia do Mês',
  placeholder = 'Dia',
  hasError = false,
  id = 'dayOfMonth',
  className,
}: DayOfMonthInputProps) {
  return (
    <div className={cn('grid gap-2', className)}>
      {showLabel && <Label htmlFor={id}>{label}</Label>}
      <DayPicker
        value={value ?? undefined}
        onChange={(day) => onChange(day)}
        placeholder={placeholder}
        disabled={disabled}
        hasError={hasError}
      />
    </div>
  );
}
