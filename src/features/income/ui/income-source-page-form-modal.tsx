'use client';

import { Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { CurrencyInput } from '@/shared/ui/currency-input';
import {
  INCOME_TYPE_CONFIG,
  INCOME_FREQUENCY_LABELS,
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
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
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
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name" className={errors.name ? 'text-destructive' : ''}>
              Nome
            </Label>
            <Input
              id="name"
              placeholder="Ex: Salário da Empresa X"
              value={formData.name}
              onChange={(e) => onUpdateField('name', e.target.value)}
              className={errors.name ? 'border-destructive' : ''}
            />
          </div>

          {/* Type and Frequency */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="type">Tipo</Label>
              <Select
                value={formData.type}
                onValueChange={(value) => onUpdateField('type', value as IncomeType)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(INCOME_TYPE_CONFIG).map(([key, { label, icon }]) => (
                    <SelectItem key={key} value={key}>
                      <div className="flex items-center gap-2">
                        <span>{icon}</span>
                        {label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="frequency">Frequência</Label>
              <Select
                value={formData.frequency}
                onValueChange={(value) => onUpdateField('frequency', value as IncomeFrequency)}
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

          {/* Amount and Day */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="amount" className={errors.amount ? 'text-destructive' : ''}>
                Valor
              </Label>
              <CurrencyInput
                id="amount"
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
                placeholder="5"
                value={formData.dayOfMonth || ''}
                onChange={(e) =>
                  onUpdateField('dayOfMonth', parseInt(e.target.value) || undefined)
                }
              />
            </div>
          </div>

          {/* Member */}
          {members.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="member">Quem Recebe</Label>
              <Select
                value={formData.memberId || ''}
                onValueChange={(value) => onUpdateField('memberId', value || undefined)}
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

          {/* Account */}
          {filteredAccounts.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="account">Conta de Destino</Label>
              <Select
                value={formData.accountId || ''}
                onValueChange={(value) => onUpdateField('accountId', value || undefined)}
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

        <DialogFooter className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting} className="w-1/4">
            Cancelar
          </Button>
          <Button onClick={onSubmit} disabled={isSubmitting} className="w-1/4">
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEditing ? 'Salvar' : 'Adicionar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
