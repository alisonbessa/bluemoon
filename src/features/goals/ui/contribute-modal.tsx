'use client';

import { Button } from '@/shared/ui/button';
import { Label } from '@/shared/ui/label';
import { CurrencyInput } from '@/shared/ui/currency-input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog';
import { formatCurrency } from '@/shared/lib/formatters';
import type { Goal } from '@/types';
import type { Account } from '@/types/account';

interface ContributeModalProps {
  goal: Goal | null;
  amountCents: number;
  onAmountChange: (valueInCents: number) => void;
  accountId: string;
  onAccountChange: (accountId: string) => void;
  accounts: Account[];
  onClose: () => void;
  onSubmit: () => void;
}

export function ContributeModal({
  goal,
  amountCents,
  onAmountChange,
  accountId,
  onAccountChange,
  accounts,
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

        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="contributeFromAccount">Conta de origem</Label>
            <Select value={accountId} onValueChange={onAccountChange}>
              <SelectTrigger id="contributeFromAccount">
                <SelectValue placeholder="Selecione a conta" />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    <span className="flex items-center gap-2">
                      <span>{account.icon || '💳'}</span>
                      <span>{account.name}</span>
                      <span className="text-muted-foreground">
                        ({formatCurrency(account.balance)})
                      </span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              O valor será transferido desta conta para a meta
            </p>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="contributeAmount">Valor da contribuição</Label>
            <CurrencyInput
              id="contributeAmount"
              value={amountCents}
              onChange={onAmountChange}
              autoFocus
              placeholder="0,00"
            />
            {goal && goal.monthlyTarget > 0 && (
              <p className="text-xs text-muted-foreground">
                Sugestão mensal: {formatCurrency(goal.monthlyTarget)}
              </p>
            )}
          </div>
        </div>

        <DialogFooter className="flex justify-end gap-2">
          <Button variant="outline" className="w-1/4" onClick={onClose}>
            Cancelar
          </Button>
          <Button className="w-1/4" onClick={onSubmit}>
            Contribuir
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
