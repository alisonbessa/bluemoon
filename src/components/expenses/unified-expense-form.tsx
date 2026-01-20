'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/shared/ui/dialog';
import { Button } from '@/shared/ui/button';
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
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface Account {
  id: string;
  name: string;
  type: string;
  icon?: string | null;
}

interface Category {
  id: string;
  name: string;
  icon?: string | null;
}

interface RecurringBillSummary {
  id: string;
  name: string;
  amount: number;
  frequency: 'weekly' | 'monthly' | 'yearly';
  dueDay: number | null;
  dueMonth: number | null;
  accountId: string;
  isAutoDebit: boolean;
  isVariable: boolean;
}

interface UnifiedExpenseFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  budgetId: string;
  accounts: Account[];
  categories: Category[];
  defaultCategoryId?: string;
  defaultIsRecurring?: boolean;
  editingBill?: RecurringBillSummary | null;
}

const FREQUENCY_OPTIONS = [
  { value: 'monthly', label: 'Mensal' },
  { value: 'weekly', label: 'Semanal' },
  { value: 'yearly', label: 'Anual' },
];

const DAYS_OF_MONTH = Array.from({ length: 31 }, (_, i) => i + 1);
const DAYS_OF_WEEK = [
  { value: 0, label: 'Domingo' },
  { value: 1, label: 'Segunda-feira' },
  { value: 2, label: 'Terça-feira' },
  { value: 3, label: 'Quarta-feira' },
  { value: 4, label: 'Quinta-feira' },
  { value: 5, label: 'Sexta-feira' },
  { value: 6, label: 'Sábado' },
];
const MONTHS = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];

export function UnifiedExpenseForm({
  isOpen,
  onClose,
  onSuccess,
  budgetId,
  accounts,
  categories,
  defaultCategoryId,
  defaultIsRecurring = false,
  editingBill,
}: UnifiedExpenseFormProps) {
  // Form state
  const [name, setName] = useState('');
  const [amount, setAmount] = useState(0);
  const [accountId, setAccountId] = useState<string | undefined>();
  const [categoryId, setCategoryId] = useState<string | undefined>(defaultCategoryId);
  const [isRecurring, setIsRecurring] = useState(defaultIsRecurring);
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [frequency, setFrequency] = useState<'weekly' | 'monthly' | 'yearly'>('monthly');
  const [dueDay, setDueDay] = useState<number | undefined>();
  const [dueMonth, setDueMonth] = useState<number | undefined>();
  const [isAutoDebit, setIsAutoDebit] = useState(false);
  const [isVariable, setIsVariable] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset form when opening/closing or switching mode
  useEffect(() => {
    if (isOpen) {
      if (editingBill) {
        // Editing existing recurring bill
        setName(editingBill.name);
        setAmount(editingBill.amount);
        setAccountId(editingBill.accountId);
        setCategoryId(defaultCategoryId);
        setIsRecurring(true); // Always recurring when editing a bill
        setFrequency(editingBill.frequency);
        setDueDay(editingBill.dueDay ?? undefined);
        setDueMonth(editingBill.dueMonth ?? undefined);
        setIsAutoDebit(editingBill.isAutoDebit);
        setIsVariable(editingBill.isVariable);
      } else {
        // New expense
        setName('');
        setAmount(0);
        setAccountId(accounts[0]?.id);
        setCategoryId(defaultCategoryId);
        setIsRecurring(defaultIsRecurring);
        setDate(format(new Date(), 'yyyy-MM-dd'));
        setFrequency('monthly');
        setDueDay(undefined);
        setDueMonth(undefined);
        setIsAutoDebit(false);
        setIsVariable(false);
      }
    }
  }, [isOpen, editingBill, defaultCategoryId, defaultIsRecurring, accounts]);

  const handleSubmit = async () => {
    // Validation
    if (!name.trim()) {
      toast.error('Digite o nome da despesa');
      return;
    }
    if (amount <= 0) {
      toast.error('Digite um valor válido');
      return;
    }
    if (!accountId) {
      toast.error('Selecione uma conta');
      return;
    }
    if (isRecurring && !categoryId) {
      toast.error('Selecione uma categoria para despesas recorrentes');
      return;
    }
    if (isRecurring && frequency === 'yearly' && !dueMonth) {
      toast.error('Selecione o mês de vencimento para despesas anuais');
      return;
    }

    setIsSubmitting(true);

    try {
      if (isRecurring) {
        // Create/Update recurring bill
        const url = editingBill
          ? `/api/app/recurring-bills/${editingBill.id}`
          : '/api/app/recurring-bills';

        const response = await fetch(url, {
          method: editingBill ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            budgetId,
            categoryId,
            accountId,
            name: name.trim(),
            amount,
            frequency,
            dueDay,
            dueMonth: frequency === 'yearly' ? dueMonth : null,
            isAutoDebit,
            isVariable,
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Erro ao salvar despesa recorrente');
        }

        toast.success(
          editingBill ? 'Despesa recorrente atualizada!' : 'Despesa recorrente criada!'
        );
      } else {
        // Create one-off transaction
        const response = await fetch('/api/app/transactions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            budgetId,
            accountId,
            categoryId: categoryId || undefined,
            type: 'expense',
            status: 'cleared',
            amount,
            description: name.trim(),
            date: new Date(date).toISOString(),
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Erro ao criar transação');
        }

        toast.success('Despesa criada!');
      }

      onSuccess();
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao salvar');
    } finally {
      setIsSubmitting(false);
    }
  };

  const title = editingBill
    ? 'Editar Despesa Recorrente'
    : isRecurring
      ? 'Nova Despesa Recorrente'
      : 'Nova Despesa';

  const description = editingBill
    ? 'Altere os dados da despesa recorrente'
    : isRecurring
      ? 'Será gerada automaticamente com base na frequência'
      : 'Registrar uma despesa avulsa';

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Nome */}
          <div className="grid gap-2">
            <Label htmlFor="expense-name">Nome *</Label>
            <Input
              id="expense-name"
              placeholder={
                isRecurring ? 'Ex: Aluguel, Netflix...' : 'Ex: Compra no mercado...'
              }
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>

          {/* Toggle Recorrente (só para nova despesa) */}
          {!editingBill && (
            <div className="flex items-center justify-between rounded-lg border p-3 bg-muted/30">
              <div className="space-y-0.5">
                <Label
                  htmlFor="expense-recurring"
                  className="text-sm font-medium cursor-pointer"
                >
                  É recorrente?
                </Label>
                <p className="text-xs text-muted-foreground">
                  {isRecurring ? 'Será gerada automaticamente' : 'Transação única'}
                </p>
              </div>
              <Switch
                id="expense-recurring"
                checked={isRecurring}
                onCheckedChange={setIsRecurring}
              />
            </div>
          )}

          {/* Valor + Frequência/Data */}
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="expense-amount">Valor *</Label>
              <CurrencyInput
                id="expense-amount"
                value={amount}
                onChange={setAmount}
                placeholder="0,00"
              />
            </div>

            {isRecurring ? (
              <div className="grid gap-2">
                <Label>Frequência</Label>
                <Select
                  value={frequency}
                  onValueChange={(v) => {
                    setFrequency(v as 'weekly' | 'monthly' | 'yearly');
                    setDueDay(undefined);
                    setDueMonth(undefined);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FREQUENCY_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="grid gap-2">
                <Label htmlFor="expense-date">Data</Label>
                <Input
                  id="expense-date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
            )}
          </div>

          {/* Campos de vencimento (só recorrente) */}
          {isRecurring && (
            <>
              {frequency === 'weekly' ? (
                <div className="grid gap-2">
                  <Label>Dia da semana</Label>
                  <Select
                    value={dueDay?.toString() || ''}
                    onValueChange={(v) => setDueDay(parseInt(v))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o dia" />
                    </SelectTrigger>
                    <SelectContent>
                      {DAYS_OF_WEEK.map((day) => (
                        <SelectItem key={day.value} value={day.value.toString()}>
                          {day.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div className={frequency === 'yearly' ? 'grid grid-cols-2 gap-4' : ''}>
                  <div className="grid gap-2">
                    <Label>Dia do vencimento</Label>
                    <Select
                      value={dueDay?.toString() || ''}
                      onValueChange={(v) => setDueDay(parseInt(v))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o dia" />
                      </SelectTrigger>
                      <SelectContent>
                        {DAYS_OF_MONTH.map((day) => (
                          <SelectItem key={day} value={day.toString()}>
                            Dia {day}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {frequency === 'yearly' && (
                    <div className="grid gap-2">
                      <Label>Mês *</Label>
                      <Select
                        value={dueMonth?.toString() || ''}
                        onValueChange={(v) => setDueMonth(parseInt(v))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o mês" />
                        </SelectTrigger>
                        <SelectContent>
                          {MONTHS.map((month, index) => (
                            <SelectItem key={index + 1} value={(index + 1).toString()}>
                              {month}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* Categoria */}
          <div className="grid gap-2">
            <Label>Categoria {isRecurring && '*'}</Label>
            <Select value={categoryId || ''} onValueChange={setCategoryId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma categoria" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.icon} {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Conta */}
          <div className="grid gap-2">
            <Label>Conta *</Label>
            <Select value={accountId || ''} onValueChange={setAccountId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma conta" />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((acc) => (
                  <SelectItem key={acc.id} value={acc.id}>
                    {acc.icon} {acc.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Opções extras (só recorrente) */}
          {isRecurring && (
            <div className="space-y-3 rounded-lg border p-3">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="expense-autoDebit" className="text-sm">
                    Débito automático
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Confirmar automaticamente no vencimento
                  </p>
                </div>
                <Switch
                  id="expense-autoDebit"
                  checked={isAutoDebit}
                  onCheckedChange={setIsAutoDebit}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="expense-variable" className="text-sm">
                    Valor variável
                  </Label>
                  <p className="text-xs text-muted-foreground">O valor é uma estimativa</p>
                </div>
                <Switch
                  id="expense-variable"
                  checked={isVariable}
                  onCheckedChange={setIsVariable}
                />
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !name.trim() || amount <= 0 || !accountId}
          >
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {editingBill ? 'Salvar' : 'Criar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
