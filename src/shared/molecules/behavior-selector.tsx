'use client';

import { cn } from '@/shared/lib/utils';
import { Label } from '@/shared/ui/label';

type BehaviorType = 'set_aside' | 'refill_up';

interface BehaviorSelectorProps {
  value: BehaviorType;
  onChange: (value: BehaviorType) => void;
  disabled?: boolean;
  /** Show label above the selector. Defaults to true */
  showLabel?: boolean;
  /** Show description below the selector. Defaults to true */
  showDescription?: boolean;
  className?: string;
}

const BEHAVIOR_CONFIG: Record<BehaviorType, { label: string; description: string; tip: string }> = {
  refill_up: {
    label: 'Zera',
    description: 'Reinicia todo mês',
    tip: 'Ideal para gastos fixos como aluguel e contas',
  },
  set_aside: {
    label: 'Acumula',
    description: 'Passa pro próximo',
    tip: 'Ideal para gastos pessoais, viagens e metas de economia',
  },
};

/**
 * BehaviorSelector - Molecule for selecting category rollover behavior
 *
 * Two options:
 * - refill_up (Zera): Resets every month, ideal for fixed expenses
 * - set_aside (Acumula): Carries over to next month, ideal for savings goals
 *
 * @example
 * ```tsx
 * <BehaviorSelector
 *   value={behavior}
 *   onChange={setBehavior}
 * />
 * ```
 */
export function BehaviorSelector({
  value,
  onChange,
  disabled = false,
  showLabel = true,
  showDescription = true,
  className,
}: BehaviorSelectorProps) {
  return (
    <div className={cn('grid gap-2', className)}>
      {showLabel && <Label>Sobra do mês</Label>}
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => onChange('refill_up')}
          disabled={disabled}
          className={cn(
            'flex flex-col items-start gap-0.5 rounded-lg border p-3 text-left transition-colors',
            value === 'refill_up'
              ? 'border-primary bg-primary/5'
              : 'border-muted hover:bg-muted/50',
            disabled && 'opacity-50 cursor-not-allowed'
          )}
        >
          <span className="font-medium text-sm">{BEHAVIOR_CONFIG.refill_up.label}</span>
          <span className="text-[11px] text-muted-foreground leading-tight">
            {BEHAVIOR_CONFIG.refill_up.description}
          </span>
        </button>
        <button
          type="button"
          onClick={() => onChange('set_aside')}
          disabled={disabled}
          className={cn(
            'flex flex-col items-start gap-0.5 rounded-lg border p-3 text-left transition-colors',
            value === 'set_aside'
              ? 'border-primary bg-primary/5'
              : 'border-muted hover:bg-muted/50',
            disabled && 'opacity-50 cursor-not-allowed'
          )}
        >
          <span className="font-medium text-sm">{BEHAVIOR_CONFIG.set_aside.label}</span>
          <span className="text-[11px] text-muted-foreground leading-tight">
            {BEHAVIOR_CONFIG.set_aside.description}
          </span>
        </button>
      </div>
      {showDescription && (
        <p className="text-xs text-muted-foreground">{BEHAVIOR_CONFIG[value].tip}</p>
      )}
    </div>
  );
}

export { BEHAVIOR_CONFIG };
export type { BehaviorType };
