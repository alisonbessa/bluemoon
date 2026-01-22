'use client';

import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Switch } from '@/shared/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select';
import { CurrencyInput } from '@/shared/ui/currency-input';
import {
  FormModalWrapper,
  FrequencySelector,
  DayOfMonthInput,
  AccountSelector,
} from '@/shared/molecules';
import { INCOME_TYPE_CONFIG } from '@/features/budget/types';

type IncomeType = 'salary' | 'benefit' | 'freelance' | 'rental' | 'investment' | 'other';
type IncomeFrequency = 'monthly' | 'biweekly' | 'weekly';

interface Account {
  id: string;
  name: string;
  type: string;
  icon?: string | null;
}

interface Member {
  id: string;
  name: string;
  color: string | null;
}

interface IncomeSourceFormData {
  name: string;
  type: IncomeType;
  amount: number;
  frequency: IncomeFrequency;
  dayOfMonth?: number;
  memberId?: string;
  accountId?: string;
  isAutoConfirm?: boolean;
}

interface IncomeSourceFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: () => Promise<void>;
  isSubmitting: boolean;
  isEditing: boolean;

  // Form data
  formData: IncomeSourceFormData;
  onFieldChange: <K extends keyof IncomeSourceFormData>(
    field: K,
    value: IncomeSourceFormData[K]
  ) => void;
  errors: Record<string, boolean>;

  // Reference data
  members: Member[];
  filteredAccounts: Account[];
}

/**
 * IncomeSourceFormModal - Modal for creating/editing income sources
 */
export function IncomeSourceFormModal({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting,
  isEditing,
  formData,
  onFieldChange,
  errors,
  members,
  filteredAccounts,
}: IncomeSourceFormModalProps) {
  return (
    <FormModalWrapper
      open={isOpen}
      onOpenChange={(open) => !open && onClose()}
      title={isEditing ? 'Editar Fonte de Renda' : 'Nova Fonte de Renda'}
      description={
        isEditing
          ? 'Altere os dados da fonte de renda'
          : 'Adicione uma nova fonte de renda ao seu planejamento'
      }
      isSubmitting={isSubmitting}
      onSubmit={onSubmit}
      submitLabel={isEditing ? 'Salvar' : 'Adicionar'}
      size="default"
    >
      <div className="grid gap-4">
        {/* Nome */}
        <div className="grid gap-2">
          <Label htmlFor="incomeSourceName">Nome *</Label>
          <Input
            id="incomeSourceName"
            placeholder="Ex: Salário, Freelance, Aluguel..."
            value={formData.name}
            onChange={(e) => onFieldChange('name', e.target.value)}
            className={errors.name ? 'border-destructive' : ''}
            autoFocus
          />
        </div>

        {/* Tipo e Frequência */}
        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label>Tipo *</Label>
            <Select
              value={formData.type}
              onValueChange={(value) => {
                onFieldChange('type', value as IncomeType);
                onFieldChange('accountId', undefined);
              }}
            >
              <SelectTrigger className={errors.type ? 'border-destructive' : ''}>
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(INCOME_TYPE_CONFIG).map(([key, config]) => (
                  <SelectItem key={key} value={key}>
                    <span className="flex items-center gap-2">
                      <span>{config.icon}</span>
                      <span>{config.label}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <FrequencySelector
            value={formData.frequency}
            onChange={(value) => onFieldChange('frequency', value)}
            hasError={errors.frequency}
          />
        </div>

        {/* Valor e Dia do Pagamento */}
        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label>Valor *</Label>
            <CurrencyInput
              value={formData.amount}
              onChange={(value) => onFieldChange('amount', value)}
              className={errors.amount ? 'border-destructive' : ''}
            />
          </div>

          <DayOfMonthInput
            value={formData.dayOfMonth}
            onChange={(val) => onFieldChange('dayOfMonth', val)}
            label="Dia do Pagamento"
            id="incomeSourceDayOfMonth"
          />
        </div>

        {/* Responsável */}
        {members.length > 1 && (
          <div className="grid gap-2">
            <Label>Quem Recebe</Label>
            <Select
              value={formData.memberId || 'none'}
              onValueChange={(value) =>
                onFieldChange('memberId', value === 'none' ? undefined : value)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhum responsável específico</SelectItem>
                {members.map((member) => (
                  <SelectItem key={member.id} value={member.id}>
                    <span className="flex items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: member.color || '#6366f1' }}
                      />
                      <span>{member.name}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Conta de Destino */}
        {filteredAccounts.length > 0 && (
          <AccountSelector
            value={formData.accountId}
            onChange={(val) => onFieldChange('accountId', val)}
            accounts={filteredAccounts}
            label="Conta de Destino"
          />
        )}

        {/* Confirmação Automática */}
        <div className="flex items-center justify-between rounded-lg border p-3">
          <div className="space-y-0.5">
            <Label htmlFor="incomeAutoConfirm" className="cursor-pointer">
              Confirmação automática
            </Label>
            <p className="text-xs text-muted-foreground">
              Confirmar automaticamente quando chegar o dia
            </p>
          </div>
          <Switch
            id="incomeAutoConfirm"
            checked={formData.isAutoConfirm || false}
            onCheckedChange={(checked) => onFieldChange('isAutoConfirm', checked)}
          />
        </div>
      </div>
    </FormModalWrapper>
  );
}
