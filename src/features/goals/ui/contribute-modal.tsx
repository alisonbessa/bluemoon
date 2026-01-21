'use client';

import { FormModalWrapper } from '@/shared/molecules';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { formatCurrency } from '@/shared/lib/formatters';
import type { Goal } from '@/types';

interface ContributeModalProps {
  goal: Goal | null;
  amount: string;
  onAmountChange: (value: string) => void;
  onClose: () => void;
  onSubmit: () => void;
}

export function ContributeModal({
  goal,
  amount,
  onAmountChange,
  onClose,
  onSubmit,
}: ContributeModalProps) {
  return (
    <FormModalWrapper
      open={!!goal}
      onOpenChange={(open) => !open && onClose()}
      title={`${goal?.icon || ''} Contribuir para ${goal?.name || ''}`}
      description={`Progresso atual: ${formatCurrency(goal?.currentAmount || 0)} de ${formatCurrency(goal?.targetAmount || 0)}`}
      size="sm"
      onSubmit={onSubmit}
      submitLabel="Contribuir"
    >
      <div className="space-y-2">
        <Label htmlFor="contributeAmount">Valor da contribuição</Label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            R$
          </span>
          <Input
            id="contributeAmount"
            type="number"
            step="0.01"
            min="0"
            placeholder="0,00"
            className="pl-10"
            value={amount}
            onChange={(e) => onAmountChange(e.target.value)}
            autoFocus
          />
        </div>
        {goal && goal.monthlyTarget > 0 && (
          <p className="text-xs text-muted-foreground">
            Sugestão mensal: {formatCurrency(goal.monthlyTarget)}
          </p>
        )}
      </div>
    </FormModalWrapper>
  );
}
