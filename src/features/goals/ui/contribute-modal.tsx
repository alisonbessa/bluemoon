'use client';

import { getAccountTypeIcon } from '@/features/accounts/types';
import { Label } from '@/shared/ui/label';
import { CurrencyInput } from '@/shared/ui/currency-input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select';
import { FormModalWrapper } from '@/shared/molecules';
import { formatCurrency } from '@/shared/lib/formatters';
import type { Goal } from '@/features/goals';
import type { Account } from '@/features/accounts';

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
    <FormModalWrapper
      open={!!goal}
      onOpenChange={(open) => !open && onClose()}
      title={`Contribuir para ${goal?.name}`}
      description={`Progresso atual: ${formatCurrency(goal?.currentAmount || 0)} de ${formatCurrency(goal?.targetAmount || 0)}`}
      onSubmit={onSubmit}
      submitLabel="Contribuir"
    >
      <div className="grid gap-4">
        <div className="grid gap-2">
          <Label htmlFor="contributeFromAccount">Forma de pagamento de origem</Label>
          <Select value={accountId} onValueChange={onAccountChange}>
            <SelectTrigger id="contributeFromAccount">
              <SelectValue placeholder="Selecione a forma de pagamento" />
            </SelectTrigger>
            <SelectContent>
              {accounts.map((account) => (
                <SelectItem key={account.id} value={account.id}>
                  <span className="flex items-center gap-2">
                    <span>{getAccountTypeIcon(account.type)}</span>
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
    </FormModalWrapper>
  );
}
