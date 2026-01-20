'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select';
import { Label } from '@/shared/ui/label';
import { cn } from '@/shared/lib/utils';

type IncomeFrequency = 'monthly' | 'biweekly' | 'weekly';

interface FrequencySelectorProps {
  value: IncomeFrequency;
  onChange: (value: IncomeFrequency) => void;
  disabled?: boolean;
  /** Show label above the selector. Defaults to true */
  showLabel?: boolean;
  /** Show error state */
  hasError?: boolean;
  /** Placeholder text */
  placeholder?: string;
  className?: string;
}

const FREQUENCY_LABELS: Record<IncomeFrequency, string> = {
  monthly: 'Mensal',
  biweekly: 'Quinzenal',
  weekly: 'Semanal',
};

/**
 * FrequencySelector - Molecule for selecting income frequency
 *
 * Options:
 * - monthly: Once per month
 * - biweekly: Twice per month
 * - weekly: Every week
 *
 * @example
 * ```tsx
 * <FrequencySelector
 *   value={frequency}
 *   onChange={setFrequency}
 * />
 * ```
 */
export function FrequencySelector({
  value,
  onChange,
  disabled = false,
  showLabel = true,
  hasError = false,
  placeholder = 'Selecione...',
  className,
}: FrequencySelectorProps) {
  return (
    <div className={cn('grid gap-2', className)}>
      {showLabel && <Label>Frequência *</Label>}
      <Select
        value={value}
        onValueChange={(val) => onChange(val as IncomeFrequency)}
        disabled={disabled}
      >
        <SelectTrigger className={hasError ? 'border-destructive' : ''}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {Object.entries(FREQUENCY_LABELS).map(([key, label]) => (
            <SelectItem key={key} value={key}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export { FREQUENCY_LABELS };
export type { IncomeFrequency };
