'use client';

import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CurrencyInput } from '@/components/ui/currency-input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';

interface Account {
  id: string;
  name: string;
  icon?: string | null;
}

interface RecurringBillSummary {
  id: string;
  name: string;
  amount: number;
  frequency: string;
  dueDay: number | null;
  dueMonth: number | null;
  isAutoDebit?: boolean;
  isVariable?: boolean;
  account: { id: string; name: string; icon: string | null } | null;
}

interface RecurringBillFormProps {
  isOpen: boolean;
  onClose: () => void;
  categoryId: string;
  categoryName: string;
  budgetId: string;
  accounts: Account[];
  editingBill?: RecurringBillSummary | null;
  onSuccess: () => void;
}

const FREQUENCY_OPTIONS = [
  { value: 'monthly', label: 'Mensal' },
  { value: 'weekly', label: 'Semanal' },
  { value: 'yearly', label: 'Anual' },
];

const DAYS_OF_MONTH = Array.from({ length: 31 }, (_, i) => i + 1);
const MONTHS = [
  { value: 1, label: 'Janeiro' },
  { value: 2, label: 'Fevereiro' },
  { value: 3, label: 'Março' },
  { value: 4, label: 'Abril' },
  { value: 5, label: 'Maio' },
  { value: 6, label: 'Junho' },
  { value: 7, label: 'Julho' },
  { value: 8, label: 'Agosto' },
  { value: 9, label: 'Setembro' },
  { value: 10, label: 'Outubro' },
  { value: 11, label: 'Novembro' },
  { value: 12, label: 'Dezembro' },
];

export function RecurringBillForm({
  isOpen,
  onClose,
  categoryId,
  categoryName,
  budgetId,
  accounts,
  editingBill,
  onSuccess,
}: RecurringBillFormProps) {
  const [name, setName] = useState('');
  const [amount, setAmount] = useState(0);
  const [frequency, setFrequency] = useState<'weekly' | 'monthly' | 'yearly'>('monthly');
  const [dueDay, setDueDay] = useState<number | undefined>(undefined);
  const [dueMonth, setDueMonth] = useState<number | undefined>(undefined);
  const [accountId, setAccountId] = useState<string | undefined>(undefined);
  const [isAutoDebit, setIsAutoDebit] = useState(false);
  const [isVariable, setIsVariable] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset form when opening or when editing bill changes
  useEffect(() => {
    if (isOpen) {
      if (editingBill) {
        setName(editingBill.name);
        setAmount(editingBill.amount);
        setFrequency(editingBill.frequency as 'weekly' | 'monthly' | 'yearly');
        setDueDay(editingBill.dueDay ?? undefined);
        setDueMonth(editingBill.dueMonth ?? undefined);
        setAccountId(editingBill.account?.id ?? undefined);
        setIsAutoDebit(editingBill.isAutoDebit ?? false);
        setIsVariable(editingBill.isVariable ?? false);
      } else {
        setName('');
        setAmount(0);
        setFrequency('monthly');
        setDueDay(undefined);
        setDueMonth(undefined);
        setAccountId(undefined);
        setIsAutoDebit(false);
        setIsVariable(false);
      }
    }
  }, [isOpen, editingBill]);

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error('Digite o nome da conta');
      return;
    }

    if (amount <= 0) {
      toast.error('Digite um valor válido');
      return;
    }

    if (!accountId) {
      toast.error('Selecione uma conta de pagamento');
      return;
    }

    setIsSubmitting(true);

    try {
      const url = editingBill
        ? `/api/app/recurring-bills/${editingBill.id}`
        : '/api/app/recurring-bills';

      const response = await fetch(url, {
        method: editingBill ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          budgetId,
          categoryId,
          name: name.trim(),
          amount,
          frequency,
          dueDay: frequency !== 'weekly' ? dueDay : null,
          dueMonth: frequency === 'yearly' ? dueMonth : null,
          accountId,
          isAutoDebit,
          isVariable,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao salvar conta');
      }

      toast.success(editingBill ? 'Conta atualizada!' : 'Conta adicionada!');
      onSuccess();
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao salvar conta');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>
            {editingBill ? 'Editar Conta' : 'Nova Conta Recorrente'}
          </DialogTitle>
          <DialogDescription>
            {editingBill ? 'Altere os dados da conta' : `Adicionar conta em ${categoryName}`}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Name */}
          <div className="grid gap-2">
            <Label htmlFor="billName">Nome</Label>
            <Input
              id="billName"
              placeholder="Ex: Aluguel, Netflix, Internet..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && name.trim()) {
                  handleSubmit();
                }
              }}
              autoFocus
            />
          </div>

          {/* Amount + Frequency */}
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="billAmount">Valor</Label>
              <CurrencyInput
                id="billAmount"
                value={amount}
                onChange={setAmount}
                placeholder="0,00"
              />
            </div>

            <div className="grid gap-2">
              <Label>Frequência</Label>
              <Select
                value={frequency}
                onValueChange={(v) => setFrequency(v as 'weekly' | 'monthly' | 'yearly')}
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
          </div>

          {/* Due Day + Due Month */}
          {frequency !== 'weekly' && (
            <div className={frequency === 'yearly' ? 'grid grid-cols-2 gap-4' : ''}>
              <div className="grid gap-2">
                <Label>Dia do vencimento</Label>
                <Select
                  value={dueDay?.toString() || ''}
                  onValueChange={(v) => setDueDay(v ? parseInt(v) : undefined)}
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
                  <Label>Mês do vencimento</Label>
                  <Select
                    value={dueMonth?.toString() || ''}
                    onValueChange={(v) => setDueMonth(v ? parseInt(v) : undefined)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o mês" />
                    </SelectTrigger>
                    <SelectContent>
                      {MONTHS.map((month) => (
                        <SelectItem key={month.value} value={month.value.toString()}>
                          {month.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          )}

          {/* Account */}
          <div className="grid gap-2">
            <Label>Conta de pagamento</Label>
            <Select
              value={accountId || ''}
              onValueChange={(v) => setAccountId(v || undefined)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione a conta" />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    <span className="flex items-center gap-2">
                      <span>{account.icon || '💳'}</span>
                      <span>{account.name}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              De onde sairá o pagamento desta conta
            </p>
          </div>

          {/* Auto Debit */}
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div className="space-y-0.5">
              <Label htmlFor="autoDebit" className="text-sm font-medium">
                Débito automático
              </Label>
              <p className="text-xs text-muted-foreground">
                Confirmar automaticamente na data de vencimento
              </p>
            </div>
            <Switch
              id="autoDebit"
              checked={isAutoDebit}
              onCheckedChange={setIsAutoDebit}
            />
          </div>

          {/* Variable Amount */}
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div className="space-y-0.5">
              <Label htmlFor="variable" className="text-sm font-medium">
                Valor variável
              </Label>
              <p className="text-xs text-muted-foreground">
                O valor é uma estimativa (ex: conta de luz)
              </p>
            </div>
            <Switch
              id="variable"
              checked={isVariable}
              onCheckedChange={setIsVariable}
            />
          </div>
        </div>

        <DialogFooter className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
            className="w-1/4"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !name.trim() || amount <= 0 || !accountId}
            className="w-1/4"
          >
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {editingBill ? 'Salvar' : 'Criar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
