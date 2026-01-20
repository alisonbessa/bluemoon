'use client';

import { Loader2, Undo2, Copy } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/shared/ui/alert-dialog';
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
import { Switch } from '@/shared/ui/switch';
import { formatCurrency, formatCurrencyFromDigits } from '@/shared/lib/formatters';
import { MONTHS_PT as monthNamesFull } from '@/shared/lib/date-utils';
import type { IncomeSource, IncomeSourceData, IncomeSourceFormData, MemberSummary } from '@/types';
import { INCOME_TYPE_CONFIG, FREQUENCY_LABELS } from '@/types/income';
import { CurrencyInput } from '@/shared/ui/currency-input';

// ==================== Edit Income Allocation Modal ====================

interface EditIncomeModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingIncome: {
    incomeSource: IncomeSource;
    planned: number;
    defaultAmount: number;
  } | null;
  currentMonth: number;
  currentYear: number;
  editValue: string;
  setEditValue: (value: string) => void;
  onSave: () => void;
}

export function EditIncomeModal({
  isOpen,
  onClose,
  editingIncome,
  currentMonth,
  currentYear,
  editValue,
  setEditValue,
  onSave,
}: EditIncomeModalProps) {
  const incomeTypeIcon = editingIncome?.incomeSource.type
    ? INCOME_TYPE_CONFIG[editingIncome.incomeSource.type]?.icon || '💵'
    : '💵';

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span>{incomeTypeIcon}</span>
            <span>{editingIncome?.incomeSource.name}</span>
          </DialogTitle>
          <DialogDescription>
            Ajuste o valor previsto para {monthNamesFull[currentMonth - 1]} {currentYear}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="income-planned">Valor Previsto</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                R$
              </span>
              <Input
                id="income-planned"
                className="pl-9"
                placeholder="0,00"
                value={editValue}
                onChange={(e) => setEditValue(formatCurrencyFromDigits(e.target.value))}
                onFocus={(e) => e.target.select()}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    onSave();
                  }
                }}
                autoFocus
              />
            </div>
            {editingIncome && editingIncome.planned !== editingIncome.defaultAmount && (
              <p className="text-xs text-muted-foreground">
                Valor padrão: {formatCurrency(editingIncome.defaultAmount)}
              </p>
            )}
          </div>

          {editingIncome && editingIncome.planned !== editingIncome.defaultAmount && (
            <Button
              variant="ghost"
              size="sm"
              className="justify-start text-muted-foreground"
              onClick={() => {
                setEditValue(
                  (editingIncome.defaultAmount / 100).toFixed(2).replace('.', ',')
                );
              }}
            >
              <Undo2 className="h-4 w-4 mr-2" />
              Restaurar valor padrão
            </Button>
          )}
        </div>

        <DialogFooter className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} className="w-1/4">
            Cancelar
          </Button>
          <Button onClick={onSave} className="w-1/4">
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ==================== Income Source Form Modal ====================

interface IncomeSourceFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  isEditing: boolean;
  formData: IncomeSourceFormData;
  setFormData: (data: IncomeSourceFormData) => void;
  formErrors: Record<string, string | boolean>;
  members: MemberSummary[];
  accounts: { id: string; name: string; type: string; icon?: string | null }[];
  isSubmitting: boolean;
  onSubmit: () => void;
}

export function IncomeSourceFormModal({
  isOpen,
  onClose,
  isEditing,
  formData,
  setFormData,
  formErrors,
  members,
  accounts,
  isSubmitting,
  onSubmit,
}: IncomeSourceFormModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Editar Fonte de Renda' : 'Nova Fonte de Renda'}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Altere os dados da fonte de renda'
              : 'Adicione uma nova fonte de renda ao seu planejamento'}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Nome */}
          <div className="grid gap-2">
            <Label htmlFor="incomeSourceName">Nome *</Label>
            <Input
              id="incomeSourceName"
              placeholder="Ex: Salário, Freelance, Aluguel..."
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className={formErrors.name ? 'border-destructive' : ''}
              autoFocus
            />
            {formErrors.name && (
              <p className="text-xs text-destructive">
                {typeof formErrors.name === 'string' ? formErrors.name : 'Campo obrigatório'}
              </p>
            )}
          </div>

          {/* Tipo e Frequência */}
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Tipo *</Label>
              <Select
                value={formData.type}
                onValueChange={(value) =>
                  setFormData({
                    ...formData,
                    type: value as IncomeSourceFormData['type'],
                    accountId: undefined,
                  })
                }
              >
                <SelectTrigger className={formErrors.type ? 'border-destructive' : ''}>
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

            <div className="grid gap-2">
              <Label>Frequência *</Label>
              <Select
                value={formData.frequency}
                onValueChange={(value) =>
                  setFormData({
                    ...formData,
                    frequency: value as IncomeSourceFormData['frequency'],
                  })
                }
              >
                <SelectTrigger className={formErrors.frequency ? 'border-destructive' : ''}>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(FREQUENCY_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Valor e Dia do Pagamento */}
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Valor *</Label>
              <CurrencyInput
                value={formData.amount}
                onChange={(value) => setFormData({ ...formData, amount: value })}
                className={formErrors.amount ? 'border-destructive' : ''}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="incomeSourceDayOfMonth">Dia do Pagamento</Label>
              <Input
                id="incomeSourceDayOfMonth"
                type="number"
                min="1"
                max="31"
                placeholder="1-31"
                value={formData.dayOfMonth || ''}
                onChange={(e) => {
                  const val = e.target.value ? parseInt(e.target.value) : undefined;
                  setFormData({ ...formData, dayOfMonth: val });
                }}
              />
            </div>
          </div>

          {/* Responsável */}
          {members.length > 1 && (
            <div className="grid gap-2">
              <Label>Quem Recebe</Label>
              <Select
                value={formData.memberId || 'none'}
                onValueChange={(value) =>
                  setFormData({
                    ...formData,
                    memberId: value === 'none' ? undefined : value,
                  })
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
          {accounts.length > 0 && (
            <div className="grid gap-2">
              <Label>Conta de Destino</Label>
              <Select
                value={formData.accountId || 'none'}
                onValueChange={(value) =>
                  setFormData({
                    ...formData,
                    accountId: value === 'none' ? undefined : value,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhuma conta específica</SelectItem>
                  {accounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      <span className="flex items-center gap-2">
                        <span>{account.icon || '🏦'}</span>
                        <span>{account.name}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Confirmacao Automatica */}
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div className="space-y-0.5">
              <Label htmlFor="isAutoConfirm" className="cursor-pointer">
                Confirmacao automatica
              </Label>
              <p className="text-xs text-muted-foreground">
                Confirmar automaticamente quando chegar o dia
              </p>
            </div>
            <Switch
              id="isAutoConfirm"
              checked={formData.isAutoConfirm || false}
              onCheckedChange={(checked) =>
                setFormData({ ...formData, isAutoConfirm: checked })
              }
            />
          </div>
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

// ==================== Delete Income Source Dialog ====================

interface DeleteIncomeSourceDialogProps {
  isOpen: boolean;
  onClose: () => void;
  incomeSource: IncomeSource | null;
  onDelete: () => void;
}

export function DeleteIncomeSourceDialog({
  isOpen,
  onClose,
  incomeSource,
  onDelete,
}: DeleteIncomeSourceDialogProps) {
  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir fonte de renda?</AlertDialogTitle>
          <AlertDialogDescription>
            Tem certeza que deseja excluir &quot;{incomeSource?.name}&quot;?
            Esta ação não pode ser desfeita e também removerá todas as transações
            associadas.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={onDelete}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Excluir
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// ==================== Copy Budget Modals ====================

interface CopyBudgetConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  currentMonthName: string;
  previousMonthName: string;
  isCopying: boolean;
  onConfirm: () => void;
}

export function CopyBudgetConfirmDialog({
  isOpen,
  onClose,
  currentMonthName,
  previousMonthName,
  isCopying,
  onConfirm,
}: CopyBudgetConfirmDialogProps) {
  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Substituir alocações existentes?</AlertDialogTitle>
          <AlertDialogDescription>
            O mês de {currentMonthName} já possui alocações configuradas.
            Deseja substituí-las pelas alocações de {previousMonthName}?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isCopying}>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} disabled={isCopying}>
            {isCopying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Substituir
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

interface CopyHintModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentMonthName: string;
  previousMonthName: string;
  isCopying: boolean;
  onCopy: () => void;
}

export function CopyHintModal({
  isOpen,
  onClose,
  currentMonthName,
  previousMonthName,
  isCopying,
  onCopy,
}: CopyHintModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Copy className="h-5 w-5 text-primary" />
            Copiar planejamento anterior
          </DialogTitle>
          <DialogDescription>
            Parece que {currentMonthName} ainda não tem um planejamento definido.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <p className="text-sm text-muted-foreground">
            Você pode copiar o planejamento de{' '}
            <span className="font-medium text-foreground">{previousMonthName}</span> para
            começar rapidamente, ou definir os valores manualmente clicando em cada
            categoria.
          </p>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={onClose} className="w-full sm:w-auto">
            Fazer manualmente
          </Button>
          <Button
            onClick={() => {
              onClose();
              onCopy();
            }}
            disabled={isCopying}
            className="w-full sm:w-auto"
          >
            {isCopying ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Copy className="mr-2 h-4 w-4" />
            )}
            Copiar de {previousMonthName}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
