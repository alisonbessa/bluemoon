'use client';

import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { CurrencyInput } from '@/shared/ui/currency-input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select';

const MONTH_LABELS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];
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
  /** Current user's member ID - restricts member selector to self only */
  currentUserMemberId?: string;
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
  currentUserMemberId,
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
      <div className="grid gap-4">
        {/* Name */}
        <div className="grid gap-2">
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
          <div className="grid gap-2">
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

          {formData.frequency === 'annual' || formData.frequency === 'once' ? (
            <div className="grid gap-2">
              <Label>Mês</Label>
              <Select
                value={formData.monthOfYear?.toString() ?? ''}
                onValueChange={(val) => onUpdateField('monthOfYear', parseInt(val))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Mês" />
                </SelectTrigger>
                <SelectContent>
                  {MONTH_LABELS.map((label, i) => (
                    <SelectItem key={i + 1} value={(i + 1).toString()}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <DayOfMonthInput
              value={formData.dayOfMonth}
              onChange={(value) => onUpdateField('dayOfMonth', value)}
              label="Dia do Pagamento"
              placeholder="1-31"
            />
          )}
        </div>

        {formData.frequency === 'once' && (
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Ano</Label>
              <Select
                value={formData.yearOfPayment?.toString() ?? ''}
                onValueChange={(val) => onUpdateField('yearOfPayment', parseInt(val))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Ano" />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() + i).map((y) => (
                    <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DayOfMonthInput
              value={formData.dayOfMonth}
              onChange={(value) => onUpdateField('dayOfMonth', value)}
              label="Dia do Pagamento"
              placeholder="1-31"
            />
          </div>
        )}

        {/* Contribuição ao orçamento - only for Duo (multiple members) */}
        {members.length > 1 && (
          <div className="grid gap-2">
            <Label>Contribuição ao orçamento</Label>
            <CurrencyInput
              value={formData.contributionAmount ?? formData.amount}
              onChange={(value) => onUpdateField('contributionAmount', value === formData.amount ? null : value)}
              className={
                formData.contributionAmount != null && formData.contributionAmount > formData.amount
                  ? 'border-destructive'
                  : ''
              }
            />
            {formData.contributionAmount != null && formData.contributionAmount < formData.amount && (
              <p className="text-xs text-muted-foreground">
                Reserva pessoal: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format((formData.amount - formData.contributionAmount) / 100)}
              </p>
            )}
            {formData.contributionAmount != null && formData.contributionAmount > formData.amount && (
              <p className="text-xs text-destructive">
                Contribuição não pode ser maior que o valor da renda
              </p>
            )}
            {formData.contributionAmount == null && (
              <p className="text-xs text-muted-foreground">
                100% da renda vai para o orçamento compartilhado
              </p>
            )}
          </div>
        )}

        {/* Member */}
        {members.length > 1 && (
          <MemberSelector
            value={formData.memberId}
            onChange={(value) => onUpdateField('memberId', value)}
            members={members}
            label="Quem Recebe"
            allowNone
            noneLabel="Dupla"
            currentUserMemberId={currentUserMemberId}
          />
        )}

        {/* Account */}
        {filteredAccounts.length > 0 && (
          <div className="grid gap-2">
            <AccountSelector
              value={formData.accountId}
              onChange={(value) => onUpdateField('accountId', value)}
              accounts={filteredAccounts}
              label="Forma de Pagamento de Destino"
              allowNone
              noneLabel="Nenhuma forma de pagamento específica"
            />
            <p className="text-xs text-muted-foreground">
              {formData.type === 'benefit'
                ? 'Apenas benefícios'
                : formData.type === 'other'
                  ? 'Todas as formas de pagamento disponíveis'
                  : 'Contas correntes e poupança'}
            </p>
          </div>
        )}
      </div>
    </FormModalWrapper>
  );
}
