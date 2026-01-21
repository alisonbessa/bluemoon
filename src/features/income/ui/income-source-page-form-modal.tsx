'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { CurrencyInput } from '@/shared/ui/currency-input';
import { FormModalWrapper, FrequencySelector } from '@/shared/molecules';
import {
  INCOME_TYPE_CONFIG,
  type IncomeFormData,
  type IncomeSource,
  type IncomeType,
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
          <div className="space-y-2">
            <Label>Tipo *</Label>
            <Select
              value={formData.type}
              onValueChange={(value) => {
                onUpdateField('type', value as IncomeType);
                onUpdateField('accountId', undefined);
              }}
            >
              <SelectTrigger className={errors.type ? 'border-destructive' : ''}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(INCOME_TYPE_CONFIG).map(([key, { label, icon }]) => (
                  <SelectItem key={key} value={key}>
                    <span className="flex items-center gap-2">
                      <span>{icon}</span>
                      <span>{label}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

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

          <div className="space-y-2">
            <Label htmlFor="dayOfMonth">Dia do Pagamento</Label>
            <Input
              id="dayOfMonth"
              type="number"
              min="1"
              max="31"
              placeholder="1-31"
              value={formData.dayOfMonth || ''}
              onChange={(e) =>
                onUpdateField('dayOfMonth', parseInt(e.target.value) || undefined)
              }
            />
          </div>
        </div>

        {/* Member */}
        {members.length > 1 && (
          <div className="space-y-2">
            <Label>Quem Recebe</Label>
            <Select
              value={formData.memberId || 'none'}
              onValueChange={(value) => onUpdateField('memberId', value === 'none' ? undefined : value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione (opcional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhum responsável específico</SelectItem>
                {members.map((member) => (
                  <SelectItem key={member.id} value={member.id}>
                    {member.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Account */}
        {filteredAccounts.length > 0 && (
          <div className="space-y-2">
            <Label>Conta de Destino</Label>
            <Select
              value={formData.accountId || 'none'}
              onValueChange={(value) => onUpdateField('accountId', value === 'none' ? undefined : value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione (opcional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhuma conta específica</SelectItem>
                {filteredAccounts.map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    <span className="flex items-center gap-2">
                      <span>{account.icon || '🏦'}</span>
                      <span>{account.name}</span>
                    </span>
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
    </FormModalWrapper>
  );
}
