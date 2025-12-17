'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatCurrency } from '@/lib/formatters';
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
    <Dialog open={!!goal} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="text-2xl">{goal?.icon}</span>
            Contribuir para {goal?.name}
          </DialogTitle>
          <DialogDescription>
            Progresso atual: {formatCurrency(goal?.currentAmount || 0)} de{' '}
            {formatCurrency(goal?.targetAmount || 0)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
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
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={onSubmit}>Contribuir</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
