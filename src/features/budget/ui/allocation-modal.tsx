'use client';

import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { cn } from '@/shared/lib/utils';
import {
  FormModalWrapper,
  BehaviorSelector,
  WeekdaySelector,
  DayOfMonthInput,
  MonthGridSelector,
} from '@/shared/molecules';

type AllocationFrequency = 'weekly' | 'monthly' | 'yearly' | 'once';

const FREQUENCY_OPTIONS: { value: AllocationFrequency; label: string }[] = [
  { value: 'weekly', label: 'Semanal' },
  { value: 'monthly', label: 'Mensal' },
  { value: 'yearly', label: 'Anual' },
  { value: 'once', label: 'Único' },
];

interface Category {
  id: string;
  name: string;
  icon?: string | null;
  behavior: 'set_aside' | 'refill_up';
}

interface AllocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => Promise<void>;
  isSaving: boolean;

  // Category info
  category: Category | null;
  monthName: string;
  year: number;
  currentMonth: number;

  // Form values
  inputValue: string;
  onInputValueChange: (value: string) => void;
  behavior: 'set_aside' | 'refill_up';
  onBehaviorChange: (value: 'set_aside' | 'refill_up') => void;
  frequency: AllocationFrequency;
  onFrequencyChange: (value: AllocationFrequency) => void;
  weekday: number | null;
  onWeekdayChange: (value: number | null) => void;
  dueDay: number | null;
  onDueDayChange: (value: number | null) => void;
  yearMonth: number | null;
  onYearMonthChange: (value: number | null) => void;

  // Computed values
  monthlyValueDescription: string;
}

/**
 * AllocationModal - Modal for editing category allocation
 *
 * Supports multiple frequency options:
 * - Weekly: select day of week, calculates monthly total
 * - Monthly: simple value input
 * - Yearly: select month and day of month
 * - Once: single allocation
 */
export function AllocationModal({
  isOpen,
  onClose,
  onSave,
  isSaving,
  category,
  monthName,
  year,
  currentMonth,
  inputValue,
  onInputValueChange,
  behavior,
  onBehaviorChange,
  frequency,
  onFrequencyChange,
  weekday,
  onWeekdayChange,
  dueDay,
  onDueDayChange,
  yearMonth,
  onYearMonthChange,
  monthlyValueDescription,
}: AllocationModalProps) {
  if (!category) return null;

  return (
    <FormModalWrapper
      open={isOpen}
      onOpenChange={(open) => !open && onClose()}
      title={`${category.icon || '📌'} ${category.name}`}
      description={`Configure a alocação para ${monthName} ${year}`}
      isSubmitting={isSaving}
      onSubmit={onSave}
      submitLabel="Salvar"
    >
      <div className="grid gap-4">
        {/* Value Input */}
        <div className="grid gap-2">
          <Label htmlFor="allocated">
            {frequency === 'weekly' ? 'Valor por Semana' : 'Valor'}
          </Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
              R$
            </span>
            <Input
              id="allocated"
              className="pl-9"
              placeholder="0,00"
              value={inputValue}
              onChange={(e) => onInputValueChange(e.target.value)}
              onFocus={(e) => e.target.select()}
            />
          </div>
        </div>

        {/* Frequency Selector */}
        <div className="grid gap-2">
          <Label>Frequência</Label>
          <div className="grid grid-cols-4 gap-1.5">
            {FREQUENCY_OPTIONS.map((freq) => (
              <button
                key={freq.value}
                type="button"
                onClick={() => onFrequencyChange(freq.value)}
                className={cn(
                  'rounded-lg border py-2 px-2 text-xs font-medium transition-colors',
                  frequency === freq.value
                    ? 'border-primary bg-primary/5 text-primary'
                    : 'border-muted hover:bg-muted/50'
                )}
              >
                {freq.label}
              </button>
            ))}
          </div>
        </div>

        {/* Weekly: Day of Week Selector */}
        {frequency === 'weekly' && (
          <>
            <WeekdaySelector
              value={weekday}
              onChange={(val) => onWeekdayChange(val)}
            />
            {weekday !== null && monthlyValueDescription && (
              <p className="text-xs text-muted-foreground">
                {monthlyValueDescription}
              </p>
            )}
          </>
        )}

        {/* Yearly: Month and Day Selector */}
        {frequency === 'yearly' && (
          <div className="grid grid-cols-2 gap-3">
            <MonthGridSelector
              value={yearMonth}
              onChange={onYearMonthChange}
              currentMonth={currentMonth}
              label="Mês do Vencimento"
            />
            <div className="grid gap-2">
              <DayOfMonthInput
                value={dueDay}
                onChange={(val) => onDueDayChange(val ?? null)}
                label="Dia"
                placeholder="Ex: 15"
                id="dueDayYearly"
              />
              {yearMonth && monthlyValueDescription && (
                <p className="text-xs text-muted-foreground">
                  {monthlyValueDescription}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Behavior Selector */}
        <BehaviorSelector
          value={behavior}
          onChange={onBehaviorChange}
        />
      </div>
    </FormModalWrapper>
  );
}
