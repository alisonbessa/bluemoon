'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { cn } from '@/shared/lib/utils';
import { MONTHS_PT as monthNamesFull } from '@/shared/lib/date-utils';
import { formatCurrencyFromDigits } from '@/shared/lib/formatters';
import type { Category, CategoryBehavior } from '@/types/category';

interface AllocationEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  category: Category | null;
  currentMonth: number;
  currentYear: number;
  // Form state
  editValue: string;
  setEditValue: (value: string) => void;
  editFrequency: 'weekly' | 'monthly' | 'yearly' | 'once';
  setEditFrequency: (freq: 'weekly' | 'monthly' | 'yearly' | 'once') => void;
  editWeekday: number | null;
  setEditWeekday: (day: number | null) => void;
  editBehavior: CategoryBehavior;
  setEditBehavior: (behavior: CategoryBehavior) => void;
  editYearMonth: number | null;
  setEditYearMonth: (month: number | null) => void;
  editDueDay: number | null;
  setEditDueDay: (day: number | null) => void;
  onSave: () => void;
  getMonthlyValue: () => { value: number; description: string };
}

const WEEKDAYS = [
  { value: 0, label: 'Domingo', short: 'Dom' },
  { value: 1, label: 'Segunda', short: 'Seg' },
  { value: 2, label: 'Terça', short: 'Ter' },
  { value: 3, label: 'Quarta', short: 'Qua' },
  { value: 4, label: 'Quinta', short: 'Qui' },
  { value: 5, label: 'Sexta', short: 'Sex' },
  { value: 6, label: 'Sábado', short: 'Sáb' },
];

export function AllocationEditModal({
  isOpen,
  onClose,
  category,
  currentMonth,
  currentYear,
  editValue,
  setEditValue,
  editFrequency,
  setEditFrequency,
  editWeekday,
  setEditWeekday,
  editBehavior,
  setEditBehavior,
  editYearMonth,
  setEditYearMonth,
  editDueDay,
  setEditDueDay,
  onSave,
  getMonthlyValue,
}: AllocationEditModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span>{category?.icon || '📌'}</span>
            <span>{category?.name}</span>
          </DialogTitle>
          <DialogDescription>
            Configure a alocação para {monthNamesFull[currentMonth - 1]} {currentYear}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Valor */}
          <div className="grid gap-2">
            <Label htmlFor="allocated">
              {editFrequency === 'weekly' ? 'Valor por Semana' : 'Valor'}
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                R$
              </span>
              <Input
                id="allocated"
                className="pl-9"
                placeholder="0,00"
                value={editValue}
                onChange={(e) => setEditValue(formatCurrencyFromDigits(e.target.value))}
                onFocus={(e) => e.target.select()}
              />
            </div>
          </div>

          {/* Frequência */}
          <div className="grid gap-2">
            <Label>Frequência</Label>
            <div className="grid grid-cols-4 gap-1.5">
              {[
                { value: 'weekly' as const, label: 'Semanal' },
                { value: 'monthly' as const, label: 'Mensal' },
                { value: 'yearly' as const, label: 'Anual' },
                { value: 'once' as const, label: 'Único' },
              ].map((freq) => (
                <button
                  key={freq.value}
                  type="button"
                  onClick={() => setEditFrequency(freq.value)}
                  className={cn(
                    'rounded-lg border py-2 px-2 text-xs font-medium transition-colors',
                    editFrequency === freq.value
                      ? 'border-primary bg-primary/5 text-primary'
                      : 'border-muted hover:bg-muted/50'
                  )}
                >
                  {freq.label}
                </button>
              ))}
            </div>
          </div>

          {/* Campos específicos por frequência */}
          {editFrequency === 'weekly' && (
            <div className="grid gap-2">
              <Label>Dia da Semana</Label>
              <div className="grid grid-cols-7 gap-1">
                {WEEKDAYS.map((day) => (
                  <button
                    key={day.value}
                    type="button"
                    onClick={() => setEditWeekday(day.value)}
                    className={cn(
                      'rounded-lg border py-2 text-xs font-medium transition-colors',
                      editWeekday === day.value
                        ? 'border-primary bg-primary/5 text-primary'
                        : 'border-muted hover:bg-muted/50'
                    )}
                  >
                    {day.short}
                  </button>
                ))}
              </div>
              {editWeekday !== null && (
                <p className="text-xs text-muted-foreground">
                  {getMonthlyValue().description}
                </p>
              )}
            </div>
          )}

          {editFrequency === 'yearly' && (
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label>Mês do Vencimento</Label>
                <div className="grid grid-cols-4 gap-1">
                  {monthNamesFull.map((month, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setEditYearMonth(idx + 1)}
                      className={cn(
                        'rounded border py-1.5 text-[10px] font-medium transition-colors',
                        editYearMonth === idx + 1
                          ? 'border-primary bg-primary/5 text-primary'
                          : 'border-muted hover:bg-muted/50',
                        idx + 1 === currentMonth &&
                          editYearMonth !== idx + 1 &&
                          'bg-muted/30'
                      )}
                    >
                      {month.slice(0, 3)}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="dueDayYearly">Dia</Label>
                <Input
                  id="dueDayYearly"
                  type="number"
                  min="1"
                  max="31"
                  placeholder="Ex: 15"
                  value={editDueDay || ''}
                  onChange={(e) =>
                    setEditDueDay(e.target.value ? parseInt(e.target.value) : null)
                  }
                />
                {editYearMonth && (
                  <p className="text-xs text-muted-foreground">
                    {editYearMonth === currentMonth
                      ? 'Vence este mês!'
                      : `Vence em ${monthNamesFull[editYearMonth - 1]}`}
                  </p>
                )}
              </div>
            </div>
          )}

          {(editFrequency === 'monthly' || editFrequency === 'once') && (
            <div className="grid gap-2">
              <Label htmlFor="dueDayMonthly">Dia do Vencimento</Label>
              <Input
                id="dueDayMonthly"
                type="number"
                min="1"
                max="31"
                placeholder="Ex: 10"
                value={editDueDay || ''}
                onChange={(e) =>
                  setEditDueDay(e.target.value ? parseInt(e.target.value) : null)
                }
              />
              <p className="text-xs text-muted-foreground">
                {editFrequency === 'monthly'
                  ? 'Este gasto se repete todo mês'
                  : 'Este gasto é apenas para este mês'}
              </p>
            </div>
          )}

          {/* Tipo de Alocação */}
          <div className="grid gap-2">
            <Label>Sobra do mês</Label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setEditBehavior('refill_up')}
                className={cn(
                  'flex flex-col items-start gap-0.5 rounded-lg border p-3 text-left transition-colors',
                  editBehavior === 'refill_up'
                    ? 'border-primary bg-primary/5'
                    : 'border-muted hover:bg-muted/50'
                )}
              >
                <span className="font-medium text-sm">Zera</span>
                <span className="text-[11px] text-muted-foreground leading-tight">
                  Reinicia todo mês
                </span>
              </button>
              <button
                type="button"
                onClick={() => setEditBehavior('set_aside')}
                className={cn(
                  'flex flex-col items-start gap-0.5 rounded-lg border p-3 text-left transition-colors',
                  editBehavior === 'set_aside'
                    ? 'border-primary bg-primary/5'
                    : 'border-muted hover:bg-muted/50'
                )}
              >
                <span className="font-medium text-sm">Acumula</span>
                <span className="text-[11px] text-muted-foreground leading-tight">
                  Passa pro próximo
                </span>
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              {editBehavior === 'set_aside'
                ? 'Ideal para prazeres, viagens e metas de economia'
                : 'Ideal para gastos fixos como aluguel e contas'}
            </p>
          </div>
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
