'use client';

import React from 'react';
import { FormModalWrapper, AccountSelector } from '@/shared/molecules';
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
import { formatCurrencyFromDigits, parseCurrency } from '@/shared/lib/formatters';
import type { Category, Account, IncomeSource, TransactionFormData, TransactionType } from '../types';

interface TransactionFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  isEditing: boolean;
  formData: TransactionFormData;
  setFormData: React.Dispatch<React.SetStateAction<TransactionFormData>>;
  categories: Category[];
  accounts: Account[];
  incomeSources: IncomeSource[];
  isSubmitting: boolean;
  onSubmit: () => void;
}

export function TransactionFormModal({
  isOpen,
  onClose,
  isEditing,
  formData,
  setFormData,
  categories,
  accounts,
  incomeSources,
  isSubmitting,
  onSubmit,
}: TransactionFormModalProps) {
  const typeOptions = [
    { value: 'expense', label: 'Despesa', color: 'text-red-500' },
    { value: 'income', label: 'Receita', color: 'text-green-500' },
    { value: 'transfer', label: 'Transferência', color: 'text-blue-500' },
  ];

  // Check if selected account is a credit card (for installment option)
  const selectedAccount = accounts.find(a => a.id === formData.accountId);
  const isCreditCard = selectedAccount?.type === 'credit_card';
  const showInstallmentOption = formData.type === 'expense' && isCreditCard && !isEditing;

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
      <div className="space-y-4">
          {/* Type Selection */}
          <div className="space-y-2">
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
            <div className="space-y-2">
              <Label htmlFor="amount">Valor</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  R$
                </span>
                <Input
                  id="amount"
                  className="pl-10"
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

            <div className="space-y-2">
              <Label htmlFor="date">Data</Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Input
              id="description"
              placeholder="Ex: Supermercado"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
            />
          </div>

          {/* Account Selection */}
          <div
            className={formData.type === 'transfer' ? 'grid grid-cols-2 gap-4' : ''}
          >
            <AccountSelector
              value={formData.accountId}
              onChange={(value) => setFormData({ ...formData, accountId: value || '' })}
              accounts={accounts}
              label={formData.type === 'transfer' ? 'Origem' : 'Conta'}
              allowNone={false}
              placeholder="Selecione uma conta"
            />

            {formData.type === 'transfer' && (
              <AccountSelector
                value={formData.toAccountId}
                onChange={(value) => setFormData({ ...formData, toAccountId: value || '' })}
                accounts={accounts.filter((account) => account.id !== formData.accountId)}
                label="Destino"
                allowNone={false}
                placeholder="Selecione a conta"
              />
            )}
          </div>

          {/* Category (for expenses) */}
          {formData.type === 'expense' && (
            <div className="space-y-2">
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
                  <SelectValue placeholder="Selecione uma categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem categoria</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.icon || '📌'} {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Installment option (only for credit card expenses, not when editing) */}
          {showInstallmentOption && (
            <div className="space-y-3 rounded-lg border p-3 bg-muted/30">
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
                <div className="space-y-2">
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

          {/* Income Source (for income) */}
          {formData.type === 'income' && incomeSources.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="incomeSource">Fonte de Renda</Label>
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
                  <SelectValue placeholder="Selecione uma fonte" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem fonte específica</SelectItem>
                  {incomeSources.map((source) => (
                    <SelectItem key={source.id} value={source.id}>
                      {source.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
    </FormModalWrapper>
  );
}
