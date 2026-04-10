'use client';

import React from 'react';
import { FormModalWrapper, AccountSelector } from '@/shared/molecules';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Switch } from '@/shared/ui/switch';
import { formatCurrencyFromDigits, parseCurrency } from '@/shared/lib/formatters';
import { DayOfMonthInput, MonthGridSelector, MONTH_NAMES_FULL } from '@/shared/molecules';
import { useMemo } from 'react';
import type { Category, Account, IncomeSource, Transaction, TransactionFormData, TransactionType, RecurringFrequency } from '../types';

interface MemberOption {
  id: string;
  name: string;
}

interface TransactionFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  isEditing: boolean;
  editingTransaction?: Transaction | null;
  formData: TransactionFormData;
  setFormData: React.Dispatch<React.SetStateAction<TransactionFormData>>;
  categories: Category[];
  accounts: Account[];
  incomeSources: IncomeSource[];
  isSubmitting: boolean;
  onSubmit: () => void;
  applyToSeries?: boolean;
  onApplyToSeriesChange?: (value: boolean) => void;
  isDuoPlan?: boolean;
  members?: MemberOption[];
}

export function TransactionFormModal({
  isOpen,
  onClose,
  isEditing,
  editingTransaction,
  formData,
  setFormData,
  categories,
  accounts,
  incomeSources,
  isSubmitting,
  onSubmit,
  applyToSeries,
  onApplyToSeriesChange,
  isDuoPlan,
  members,
}: TransactionFormModalProps) {
  const typeOptions = [
    { value: 'expense', label: 'Despesa', color: 'text-red-500' },
    { value: 'income', label: 'Receita', color: 'text-green-500' },
    { value: 'transfer', label: 'Transferência', color: 'text-blue-500' },
  ];

  // Check if selected account is a credit card (for installment option)
  const selectedAccount = accounts.find(a => a.id === formData.accountId);
  const isCreditCard = selectedAccount?.type === 'credit_card';
  const showInstallmentOption = formData.type === 'expense' && isCreditCard && !isEditing && !formData.isRecurring;
  const showRecurringOption = formData.type === 'expense' && !isEditing && !formData.isInstallment;

  // Series editing: show when editing an installment transaction
  const showSeriesOption = isEditing && editingTransaction?.isInstallment;

  // Group categories by their group for the selector
  const groupedCategories = useMemo(() => {
    const grouped = new Map<string, { name: string; displayOrder: number; categories: Category[] }>();
    for (const cat of categories) {
      const groupName = cat.group?.name ?? 'Outros';
      const groupOrder = cat.group?.displayOrder ?? 999;
      const existing = grouped.get(groupName);
      if (existing) {
        existing.categories.push(cat);
      } else {
        grouped.set(groupName, { name: groupName, displayOrder: groupOrder, categories: [cat] });
      }
    }
    return Array.from(grouped.values())
      .sort((a, b) => a.displayOrder - b.displayOrder)
      .map((g) => ({
        ...g,
        categories: [...g.categories].sort((a, b) => a.name.localeCompare(b.name)),
      }));
  }, [categories]);

  return (
    <FormModalWrapper
      open={isOpen}
      onOpenChange={(open) => !open && onClose()}
      title={isEditing ? 'Editar Transação' : 'Nova Transação'}
      description={
        isEditing
          ? 'Atualize os dados da transação'
          : 'Registre uma nova movimentação financeira'
      }
      isSubmitting={isSubmitting}
      onSubmit={onSubmit}
      submitLabel={isEditing ? 'Salvar' : 'Criar'}
    >
      <div className="grid gap-4">
          {/* Type Selection */}
          <div className="grid gap-2">
            <Label>Tipo</Label>
            <div className="grid grid-cols-3 gap-2">
              {typeOptions.map((type) => (
                <Button
                  key={type.value}
                  type="button"
                  variant={formData.type === type.value ? 'default' : 'outline'}
                  size="sm"
                  className="w-full"
                  onClick={() =>
                    setFormData({
                      ...formData,
                      type: type.value as TransactionType,
                    })
                  }
                >
                  {type.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Amount + Date */}
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="amount">Valor</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  R$
                </span>
                <Input
                  id="amount"
                  className="pl-10 w-full"
                  placeholder="0,00"
                  value={formData.amount}
                  onChange={(e) => {
                    const formatted = formatCurrencyFromDigits(e.target.value);
                    setFormData({ ...formData, amount: formatted });
                  }}
                  onFocus={(e) => {
                    if (parseCurrency(formData.amount) === 0) {
                      setFormData({ ...formData, amount: '' });
                    }
                    e.target.select();
                  }}
                  onBlur={() => {
                    if (!formData.amount.trim()) {
                      setFormData({ ...formData, amount: '0,00' });
                    }
                  }}
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="date">Data</Label>
              <Input
                id="date"
                type="date"
                className="w-full"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              />
            </div>
          </div>

          {/* Account + Category (for expenses) */}
          {formData.type === 'expense' && (
            <div className="grid grid-cols-2 gap-4 *:min-w-0">
              <AccountSelector
                value={formData.accountId}
                onChange={(value) => setFormData({ ...formData, accountId: value || '' })}
                accounts={accounts}
                label="Conta"
                allowNone={false}
                placeholder="Selecione"
              />
              <div className="grid gap-2">
                <Label htmlFor="category">Categoria</Label>
                <Select
                  value={formData.categoryId || 'none'}
                  onValueChange={(value) =>
                    setFormData({
                      ...formData,
                      categoryId: value === 'none' ? '' : value,
                    })
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem categoria</SelectItem>
                    {groupedCategories.map((group) => (
                      <SelectGroup key={group.name}>
                        <SelectLabel className="text-xs font-semibold text-muted-foreground">{group.name}</SelectLabel>
                        {group.categories.map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.icon || '📌'} {category.name}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Account + Income Source (for income) */}
          {formData.type === 'income' && (
            <div className="grid grid-cols-2 gap-4 *:min-w-0">
              <AccountSelector
                value={formData.accountId}
                onChange={(value) => setFormData({ ...formData, accountId: value || '' })}
                accounts={accounts}
                label="Conta"
                allowNone={false}
                placeholder="Selecione"
              />
              {incomeSources.length > 0 ? (
                <div className="grid gap-2">
                  <Label htmlFor="incomeSource">Fonte</Label>
                  <Select
                    value={formData.incomeSourceId || 'none'}
                    onValueChange={(value) =>
                      setFormData({
                        ...formData,
                        incomeSourceId: value === 'none' ? '' : value,
                      })
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sem fonte</SelectItem>
                      {incomeSources.map((source) => (
                        <SelectItem key={source.id} value={source.id}>
                          {source.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div /> /* Empty space to maintain grid */
              )}
            </div>
          )}

          {/* Transfer: Origin + Destination */}
          {formData.type === 'transfer' && (
            <div className="grid grid-cols-2 gap-4 *:min-w-0">
              <AccountSelector
                value={formData.accountId}
                onChange={(value) => setFormData({ ...formData, accountId: value || '' })}
                accounts={accounts}
                label="Origem"
                allowNone={false}
                placeholder="Selecione"
              />
              <AccountSelector
                value={formData.toAccountId}
                onChange={(value) => setFormData({ ...formData, toAccountId: value || '' })}
                accounts={accounts.filter((account) => account.id !== formData.accountId)}
                label="Destino"
                allowNone={false}
                placeholder="Selecione"
              />
            </div>
          )}

          {/* Description */}
          <div className="grid gap-2">
            <Label htmlFor="description">Descrição</Label>
            <Input
              id="description"
              className="w-full"
              placeholder="Ex: Supermercado"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
            />
          </div>

          {/* Paid by selector (Duo plans only) */}
          {isDuoPlan && members && members.length >= 2 && (
            <div className="grid gap-2">
              <Label>Quem pagou?</Label>
              <div className="grid grid-cols-2 gap-2">
                {members.map((member) => (
                  <Button
                    key={member.id}
                    type="button"
                    variant={formData.paidByMemberId === member.id ? 'default' : 'outline'}
                    size="sm"
                    className="w-full"
                    onClick={() =>
                      setFormData({
                        ...formData,
                        paidByMemberId: member.id,
                      })
                    }
                  >
                    {member.name}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Series editing option (when editing an installment) */}
          {showSeriesOption && onApplyToSeriesChange && (
            <div className="flex items-center justify-between rounded-lg border p-3 bg-muted/30">
              <div className="grid gap-0.5">
                <Label htmlFor="applyToSeries" className="cursor-pointer">
                  Aplicar em todas as parcelas
                </Label>
                <span className="text-xs text-muted-foreground">
                  As alterações serão aplicadas em todas as {editingTransaction?.totalInstallments} parcelas
                </span>
              </div>
              <Switch
                id="applyToSeries"
                checked={applyToSeries || false}
                onCheckedChange={onApplyToSeriesChange}
              />
            </div>
          )}

          {/* Installment option (only for credit card expenses, not when editing or recurring) */}
          {showInstallmentOption && (
            <div className="grid gap-3 rounded-lg border p-3 bg-muted/30">
              <div className="flex items-center justify-between">
                <Label htmlFor="installment" className="cursor-pointer">
                  Parcelar compra
                </Label>
                <Switch
                  id="installment"
                  checked={formData.isInstallment}
                  onCheckedChange={(checked) =>
                    setFormData({
                      ...formData,
                      isInstallment: checked,
                      totalInstallments: checked ? 2 : 2,
                    })
                  }
                />
              </div>
              {formData.isInstallment && (
                <div className="grid gap-2">
                  <Label htmlFor="totalInstallments">Número de parcelas</Label>
                  <Select
                    value={String(formData.totalInstallments)}
                    onValueChange={(value) =>
                      setFormData({
                        ...formData,
                        totalInstallments: parseInt(value),
                      })
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 23 }, (_, i) => i + 2).map((num) => (
                        <SelectItem key={num} value={String(num)}>
                          {num}x {parseCurrency(formData.amount) > 0 && (
                            <span className="text-muted-foreground ml-1">
                              (R$ {(parseCurrency(formData.amount) / num / 100).toFixed(2).replace('.', ',')}/mês)
                            </span>
                          )}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          )}

          {/* Recurring option (expenses only, not editing or installment) */}
          {showRecurringOption && (
            <div className="grid gap-3 rounded-lg border p-3 bg-muted/30">
              <div className="flex items-center justify-between">
                <div className="grid gap-0.5">
                  <Label htmlFor="recurring" className="cursor-pointer">
                    Despesa recorrente
                  </Label>
                  <span className="text-xs text-muted-foreground">
                    Repete automaticamente no planejamento
                  </span>
                </div>
                <Switch
                  id="recurring"
                  checked={formData.isRecurring}
                  onCheckedChange={(checked) =>
                    setFormData({
                      ...formData,
                      isRecurring: checked,
                      recurringFrequency: 'monthly',
                      recurringDueDay: checked ? new Date(formData.date).getDate() : undefined,
                    })
                  }
                />
              </div>
              {formData.isRecurring && (
                <div className="grid gap-3">
                  {/* Category is required for recurring */}
                  {!formData.categoryId && (
                    <p className="text-xs text-amber-600">Selecione uma categoria acima para criar uma despesa recorrente.</p>
                  )}

                  {/* Frequency */}
                  <div className="grid gap-2">
                    <Label>Frequência</Label>
                    <div className="grid grid-cols-3 gap-2">
                      {([
                        { value: 'monthly', label: 'Mensal' },
                        { value: 'weekly', label: 'Semanal' },
                        { value: 'yearly', label: 'Anual' },
                      ] as const).map((opt) => (
                        <Button
                          key={opt.value}
                          type="button"
                          variant={formData.recurringFrequency === opt.value ? 'default' : 'outline'}
                          size="sm"
                          onClick={() =>
                            setFormData({
                              ...formData,
                              recurringFrequency: opt.value,
                              recurringDueDay: opt.value === 'weekly' ? 1 : formData.recurringDueDay,
                              recurringDueMonth: undefined,
                            })
                          }
                        >
                          {opt.label}
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* Due day for monthly/yearly */}
                  {(formData.recurringFrequency === 'monthly' || formData.recurringFrequency === 'yearly') && (
                    <DayOfMonthInput
                      value={formData.recurringDueDay ?? null}
                      onChange={(day) => setFormData({ ...formData, recurringDueDay: day ?? undefined })}
                      label="Dia do vencimento"
                    />
                  )}

                  {/* Day of week for weekly */}
                  {formData.recurringFrequency === 'weekly' && (
                    <div className="grid gap-2">
                      <Label>Dia da semana</Label>
                      <Select
                        value={String(formData.recurringDueDay ?? 1)}
                        onValueChange={(value) =>
                          setFormData({ ...formData, recurringDueDay: parseInt(value) })
                        }
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'].map((day, i) => (
                            <SelectItem key={i} value={String(i)}>{day}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* Due month for yearly */}
                  {formData.recurringFrequency === 'yearly' && (
                    <div className="grid gap-2">
                      <Label>Mês do vencimento</Label>
                      <Select
                        value={String(formData.recurringDueMonth ?? '')}
                        onValueChange={(value) =>
                          setFormData({ ...formData, recurringDueMonth: parseInt(value) })
                        }
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Selecione o mês" />
                        </SelectTrigger>
                        <SelectContent>
                          {MONTH_NAMES_FULL.map((name, i) => (
                            <SelectItem key={i + 1} value={String(i + 1)}>{name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* Auto debit */}
                  <div className="flex items-center justify-between">
                    <Label htmlFor="autoDebit" className="cursor-pointer text-xs">
                      Confirmar automaticamente no vencimento
                    </Label>
                    <Switch
                      id="autoDebit"
                      checked={formData.recurringIsAutoDebit}
                      onCheckedChange={(checked) =>
                        setFormData({ ...formData, recurringIsAutoDebit: checked })
                      }
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
    </FormModalWrapper>
  );
}
