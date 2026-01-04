'use client';

import { Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CurrencyInput } from '@/components/ui/currency-input';
import { INCOME_TYPE_CONFIG, INCOME_FREQUENCY_LABELS } from '@/types/income';

interface Member {
  id: string;
  name: string;
  type: string;
  color?: string | null;
}

interface Account {
  id: string;
  name: string;
  type: string;
  icon?: string | null;
}

export interface IncomeFormData {
  name: string;
  type: 'salary' | 'benefit' | 'freelance' | 'rental' | 'investment' | 'other';
  amount: number;
  frequency: 'monthly' | 'biweekly' | 'weekly';
  dayOfMonth?: number;
  memberId?: string;
  accountId?: string;
}

interface IncomeFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  isEditing: boolean;
  formData: IncomeFormData;
  setFormData: (data: IncomeFormData) => void;
  errors: Record<string, boolean>;
  setErrors: (errors: Record<string, boolean>) => void;
  members: Member[];
  accounts: Account[];
  isSubmitting: boolean;
  onSubmit: () => void;
}

// Account types allowed for each income type
const ALLOWED_ACCOUNT_TYPES_BY_INCOME: Record<string, string[]> = {
  salary: ['checking', 'savings'],
  freelance: ['checking', 'savings'],
  rental: ['checking', 'savings'],
  investment: ['checking', 'savings', 'investment'],
  benefit: ['benefit'],
  other: ['checking', 'savings', 'credit_card', 'cash', 'investment', 'benefit'],
};

export function IncomeFormModal({
  isOpen,
  onClose,
  isEditing,
  formData,
  setFormData,
  errors,
  setErrors,
  members,
  accounts,
  isSubmitting,
  onSubmit,
}: IncomeFormModalProps) {
  // Filter accounts based on selected income type
  const allowedTypes = ALLOWED_ACCOUNT_TYPES_BY_INCOME[formData.type] || [];
  const filteredAccounts = accounts.filter((account) =>
    allowedTypes.includes(account.type)
  );

  const handleTypeChange = (value: IncomeFormData['type']) => {
    const newAllowedTypes = ALLOWED_ACCOUNT_TYPES_BY_INCOME[value] || [];
    const currentAccount = accounts.find((a) => a.id === formData.accountId);
    const shouldClearAccount =
      currentAccount && !newAllowedTypes.includes(currentAccount.type);
    setFormData({
      ...formData,
      type: value,
      accountId: shouldClearAccount ? undefined : formData.accountId,
    });
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) {
          onClose();
          setErrors({});
        }
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Editar Renda' : 'Nova Fonte de Renda'}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Atualize os dados da fonte de renda'
              : 'Adicione uma nova fonte de renda ao orçamento'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label
              htmlFor="name"
              className={errors.name ? 'text-destructive' : ''}
            >
              Nome
            </Label>
            <Input
              id="name"
              placeholder="Ex: Salário da Empresa X"
              value={formData.name}
              onChange={(e) => {
                setFormData({ ...formData, name: e.target.value });
                if (errors.name && e.target.value.trim()) {
                  setErrors({ ...errors, name: false });
                }
              }}
              className={errors.name ? 'border-destructive' : ''}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="type">Tipo</Label>
              <Select value={formData.type} onValueChange={handleTypeChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(INCOME_TYPE_CONFIG).map(
                    ([key, { label, icon }]) => (
                      <SelectItem key={key} value={key}>
                        <div className="flex items-center gap-2">
                          <span>{icon}</span>
                          {label}
                        </div>
                      </SelectItem>
                    )
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="frequency">Frequência</Label>
              <Select
                value={formData.frequency}
                onValueChange={(value: IncomeFormData['frequency']) =>
                  setFormData({ ...formData, frequency: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(INCOME_FREQUENCY_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label
                htmlFor="amount"
                className={errors.amount ? 'text-destructive' : ''}
              >
                Valor
              </Label>
              <CurrencyInput
                id="amount"
                placeholder="0,00"
                value={formData.amount}
                onChange={(valueInCents) => {
                  setFormData({ ...formData, amount: valueInCents });
                  if (errors.amount && valueInCents > 0) {
                    setErrors({ ...errors, amount: false });
                  }
                }}
                className={errors.amount ? 'border-destructive' : ''}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="dayOfMonth">Dia do Pagamento</Label>
              <Input
                id="dayOfMonth"
                type="number"
                min="1"
                max="31"
                placeholder="5"
                value={formData.dayOfMonth || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    dayOfMonth: parseInt(e.target.value) || undefined,
                  })
                }
              />
            </div>
          </div>

          {members.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="member">Quem Recebe</Label>
              <Select
                value={formData.memberId || ''}
                onValueChange={(value) =>
                  setFormData({ ...formData, memberId: value || undefined })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione (opcional)" />
                </SelectTrigger>
                <SelectContent>
                  {members.map((member) => (
                    <SelectItem key={member.id} value={member.id}>
                      {member.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {filteredAccounts.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="account">Conta de Destino</Label>
              <Select
                value={formData.accountId || ''}
                onValueChange={(value) =>
                  setFormData({ ...formData, accountId: value || undefined })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione (opcional)" />
                </SelectTrigger>
                <SelectContent>
                  {filteredAccounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.icon || '🏦'} {account.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {formData.type === 'benefit'
                  ? 'Apenas contas de benefício'
                  : formData.type === 'other'
                    ? 'Todas as contas disponíveis'
                    : 'Contas correntes e poupança'}
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
          <Button onClick={onSubmit} disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEditing ? 'Salvar' : 'Adicionar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
