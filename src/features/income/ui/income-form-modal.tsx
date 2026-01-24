'use client';

import {
  FormModalWrapper,
  IncomeTypeSelector,
  FrequencySelector,
  MemberSelector,
  AccountSelector,
  DayOfMonthInput,
} from '@/shared/molecules';
import type { IncomeType } from '@/shared/molecules';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { CurrencyInput } from '@/shared/ui/currency-input';
import {
  ALLOWED_ACCOUNT_TYPES_BY_INCOME,
  type IncomeFormData,
} from '../types';

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
    <FormModalWrapper
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) {
          onClose();
          setErrors({});
        }
      }}
      title={isEditing ? 'Editar Renda' : 'Nova Fonte de Renda'}
      description={
        isEditing
          ? 'Atualize os dados da fonte de renda'
          : 'Adicione uma nova fonte de renda ao orcamento'
      }
      isSubmitting={isSubmitting}
      onSubmit={onSubmit}
      submitLabel={isEditing ? 'Salvar' : 'Adicionar'}
    >
      <div className="grid gap-4">
        <div className="grid gap-2">
          <Label
            htmlFor="name"
            className={errors.name ? 'text-destructive' : ''}
          >
            Nome
          </Label>
          <Input
            id="name"
            placeholder="Ex: Salario da Empresa X"
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
          <IncomeTypeSelector
            value={formData.type as IncomeType}
            onChange={(value) => handleTypeChange(value)}
            label="Tipo"
          />

          <FrequencySelector
            value={formData.frequency}
            onChange={(value) => setFormData({ ...formData, frequency: value })}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-2">
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

          <DayOfMonthInput
            value={formData.dayOfMonth}
            onChange={(value) => setFormData({ ...formData, dayOfMonth: value })}
            label="Dia do Pagamento"
            placeholder="5"
          />
        </div>

        {members.length > 0 && (
          <MemberSelector
            value={formData.memberId}
            onChange={(value) => setFormData({ ...formData, memberId: value })}
            members={members}
            label="Quem Recebe"
            allowNone
            noneLabel="Selecione (opcional)"
          />
        )}

        {filteredAccounts.length > 0 && (
          <div className="grid gap-2">
            <AccountSelector
              value={formData.accountId}
              onChange={(value) => setFormData({ ...formData, accountId: value })}
              accounts={filteredAccounts}
              label="Conta de Destino"
              allowNone
              noneLabel="Selecione (opcional)"
            />
            <p className="text-xs text-muted-foreground">
              {formData.type === 'benefit'
                ? 'Apenas contas de beneficio'
                : formData.type === 'other'
                  ? 'Todas as contas disponiveis'
                  : 'Contas correntes e poupanca'}
            </p>
          </div>
        )}
      </div>
    </FormModalWrapper>
  );
}
