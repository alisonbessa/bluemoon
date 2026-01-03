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
import { formatCurrencyFromDigits, parseCurrency } from '@/lib/formatters';

interface Category {
  id: string;
  name: string;
  icon?: string | null;
}

interface Account {
  id: string;
  name: string;
  type: string;
  icon?: string | null;
}

interface IncomeSource {
  id: string;
  name: string;
  type: string;
}

interface TransactionFormData {
  type: 'income' | 'expense' | 'transfer';
  amount: string;
  description: string;
  accountId: string;
  categoryId: string;
  incomeSourceId: string;
  toAccountId: string;
  date: string;
}

interface TransactionFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  isEditing: boolean;
  formData: TransactionFormData;
  setFormData: (data: TransactionFormData) => void;
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

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Editar Transação' : 'Nova Transação'}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Atualize os dados da transação'
              : 'Registre uma nova movimentação financeira'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
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
                      type: type.value as 'income' | 'expense' | 'transfer',
                    })
                  }
                >
                  {type.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Amount */}
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
            <div className="space-y-2 w-full">
              <Label htmlFor="account">
                {formData.type === 'transfer' ? 'Origem' : 'Conta'}
              </Label>
              <Select
                value={formData.accountId}
                onValueChange={(value) =>
                  setFormData({ ...formData, accountId: value })
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecione uma conta" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.icon || '🏦'} {account.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {formData.type === 'transfer' && (
              <div className="space-y-2 w-full">
                <Label htmlFor="toAccount">Destino</Label>
                <Select
                  value={formData.toAccountId}
                  onValueChange={(value) =>
                    setFormData({ ...formData, toAccountId: value })
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecione a conta" />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts
                      .filter((account) => account.id !== formData.accountId)
                      .map((account) => (
                        <SelectItem key={account.id} value={account.id}>
                          {account.icon || '🏦'} {account.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
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

          {/* Date */}
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

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button onClick={onSubmit} disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEditing ? 'Salvar' : 'Criar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
