'use client';

import { Label } from '@/shared/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select';

type IncomeType = 'salary' | 'benefit' | 'freelance' | 'rental' | 'investment' | 'other';

interface IncomeTypeConfig {
  icon: string;
  label: string;
}

const INCOME_TYPE_CONFIG: Record<IncomeType, IncomeTypeConfig> = {
  salary: { icon: '💼', label: 'Salário' },
  benefit: { icon: '🏛️', label: 'Benefício' },
  freelance: { icon: '💻', label: 'Freelance' },
  rental: { icon: '🏠', label: 'Aluguel' },
  investment: { icon: '📈', label: 'Investimento' },
  other: { icon: '💰', label: 'Outros' },
};

interface IncomeTypeSelectorProps {
  value: IncomeType;
  onChange: (value: IncomeType) => void;
  /** Show label above the selector. Defaults to true */
  showLabel?: boolean;
  /** Custom label text */
  label?: string;
  /** Show error state */
  hasError?: boolean;
  /** Placeholder text */
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

/**
 * IncomeTypeSelector - Molecule for selecting income source type
 *
 * Displays income types with their icons.
 * Used for:
 * - Creating/editing income sources
 * - Filtering income by type
 *
 * @example
 * ```tsx
 * <IncomeTypeSelector
 *   value={incomeType}
 *   onChange={setIncomeType}
 *   label="Tipo de Renda"
 * />
 * ```
 */
export function IncomeTypeSelector({
  value,
  onChange,
  showLabel = true,
  label = 'Tipo',
  hasError = false,
  placeholder = 'Selecione...',
  disabled = false,
  className,
}: IncomeTypeSelectorProps) {
  return (
    <div className={className}>
      {showLabel && (
        <div className="grid gap-2">
          <Label>{label}</Label>
        </div>
      )}
      <Select
        value={value}
        onValueChange={(val) => onChange(val as IncomeType)}
        disabled={disabled}
      >
        <SelectTrigger
          className={`${showLabel ? 'mt-2' : ''} ${hasError ? 'border-destructive' : ''}`}
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {Object.entries(INCOME_TYPE_CONFIG).map(([key, config]) => (
            <SelectItem key={key} value={key}>
              <span className="flex items-center gap-2">
                <span>{config.icon}</span>
                <span>{config.label}</span>
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export { INCOME_TYPE_CONFIG };
export type { IncomeType };
