'use client';

import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { CurrencyInput } from '@/shared/ui/currency-input';
import {
  FormModalWrapper,
  FrequencySelector,
  IncomeTypeSelector,
  MemberSelector,
  AccountSelector,
  DayOfMonthInput,
} from '@/shared/molecules';
import type { IncomeType } from '@/shared/molecules';
import {
  type IncomeFormData,
  type IncomeSource,
  type IncomeFrequency,
} from '../types';

interface Member {
  id: string;
  name: string;
}

interface Account {
  id: string;
  name: string;
  type: string;
  icon?: string | null;
}

interface IncomeSourcePageFormModalProps {
  isOpen: boolean;
  editingSource: IncomeSource | null;
  formData: IncomeFormData;
  errors: Record<string, boolean>;
  isSubmitting: boolean;
  filteredAccounts: Account[];
  members: Member[];
  onClose: () => void;
  onUpdateField: <K extends keyof IncomeFormData>(field: K, value: IncomeFormData[K]) => void;
  onSubmit: () => Promise<void>;
}

export function IncomeSourcePageFormModal({
  isOpen,
  editingSource,
  formData,
  errors,
  isSubmitting,
  filteredAccounts,
  members,
  onClose,
  onUpdateField,
  onSubmit,
}: IncomeSourcePageFormModalProps) {
  const isEditing = !!editingSource;

  return (
    <FormModalWrapper
      open={isOpen}
      onOpenChange={(open) => !open && onClose()}
      title={isEditing ? 'Editar Renda' : 'Nova Fonte de Renda'}
      description={
        isEditing
          ? 'Atualize os dados da fonte de renda'
          : 'Adicione uma nova fonte de renda ao orçamento'
      }
      isSubmitting={isSubmitting}
      onSubmit={onSubmit}
      submitLabel={isEditing ? 'Salvar' : 'Adicionar'}
    >
      <div className="space-y-4">
        {/* Name */}
        <div className="space-y-2">
          <Label htmlFor="name" className={errors.name ? 'text-destructive' : ''}>
            Nome *
          </Label>
          <Input
            id="name"
            placeholder="Ex: Salário da Empresa X"
            value={formData.name}
            onChange={(e) => onUpdateField('name', e.target.value)}
            className={errors.name ? 'border-destructive' : ''}
            autoFocus
          />
        </div>

        {/* Type and Frequency */}
        <div className="grid grid-cols-2 gap-4">
          <IncomeTypeSelector
            value={formData.type as IncomeType}
            onChange={(value) => {
              onUpdateField('type', value);
              onUpdateField('accountId', undefined);
            }}
            label="Tipo *"
            hasError={errors.type}
          />

          <FrequencySelector
            value={formData.frequency}
            onChange={(value) => onUpdateField('frequency', value as IncomeFrequency)}
            hasError={errors.frequency}
          />
        </div>

        {/* Amount and Day */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className={errors.amount ? 'text-destructive' : ''}>
              Valor *
            </Label>
            <CurrencyInput
              placeholder="0,00"
              value={formData.amount}
              onChange={(valueInCents) => onUpdateField('amount', valueInCents)}
              className={errors.amount ? 'border-destructive' : ''}
            />
          </div>

          <DayOfMonthInput
            value={formData.dayOfMonth}
            onChange={(value) => onUpdateField('dayOfMonth', value)}
            label="Dia do Pagamento"
            placeholder="1-31"
          />
        </div>

        {/* Member */}
        {members.length > 1 && (
          <MemberSelector
            value={formData.memberId}
            onChange={(value) => onUpdateField('memberId', value)}
            members={members}
            label="Quem Recebe"
            allowNone
            noneLabel="Nenhum responsável específico"
          />
        )}

        {/* Account */}
        {filteredAccounts.length > 0 && (
          <div className="space-y-2">
            <AccountSelector
              value={formData.accountId}
              onChange={(value) => onUpdateField('accountId', value)}
              accounts={filteredAccounts}
              label="Conta de Destino"
              allowNone
              noneLabel="Nenhuma conta específica"
            />
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
    </FormModalWrapper>
  );
}
