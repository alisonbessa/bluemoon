'use client';

import { Pencil, Trash2, Calendar, Wallet, Zap, TrendingUp } from 'lucide-react';
import { formatCurrency } from '@/shared/lib/formatters';
import { cn } from '@/shared/lib/utils';
import { Badge } from '@/shared/ui/badge';

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

interface RecurringBillItemProps {
  bill: RecurringBillSummary;
  onEdit: (bill: RecurringBillSummary) => void;
  onDelete: (bill: RecurringBillSummary) => void;
}

const FREQUENCY_LABELS: Record<string, string> = {
  weekly: 'Semanal',
  monthly: 'Mensal',
  yearly: 'Anual',
};

function formatDueDate(bill: RecurringBillSummary): string {
  if (bill.frequency === 'weekly') {
    return 'Toda semana';
  }

  if (bill.frequency === 'yearly' && bill.dueMonth && bill.dueDay) {
    const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    return `Dia ${bill.dueDay} de ${monthNames[bill.dueMonth - 1]}`;
  }

  if (bill.dueDay) {
    return `Dia ${bill.dueDay}`;
  }

  return FREQUENCY_LABELS[bill.frequency] || bill.frequency;
}

export function RecurringBillItem({ bill, onEdit, onDelete }: RecurringBillItemProps) {
  return (
    <div
      className={cn(
        'group/bill flex items-center justify-between py-1.5 px-2 rounded-md',
        'hover:bg-muted/50 transition-colors cursor-pointer'
      )}
      onClick={() => onEdit(bill)}
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        {/* Name */}
        <span className="text-sm truncate">{bill.name}</span>

        {/* Auto Debit Badge */}
        {bill.isAutoDebit && (
          <Badge variant="secondary" className="hidden sm:flex items-center gap-1 px-1.5 py-0 h-5 text-[10px] shrink-0">
            <Zap className="h-2.5 w-2.5" />
            Auto
          </Badge>
        )}

        {/* Variable Badge */}
        {bill.isVariable && (
          <Badge variant="outline" className="hidden sm:flex items-center gap-1 px-1.5 py-0 h-5 text-[10px] shrink-0">
            <TrendingUp className="h-2.5 w-2.5" />
            Variável
          </Badge>
        )}

        {/* Due Date Badge */}
        <span className="hidden sm:flex items-center gap-1 text-xs text-muted-foreground shrink-0">
          <Calendar className="h-3 w-3" />
          {formatDueDate(bill)}
        </span>

        {/* Account Badge */}
        {bill.account && (
          <span className="hidden md:flex items-center gap-1 text-xs text-muted-foreground shrink-0">
            <Wallet className="h-3 w-3" />
            <span>{bill.account.icon || '💳'}</span>
            <span className="truncate max-w-[80px]">{bill.account.name}</span>
          </span>
        )}
      </div>

      <div className="flex items-center gap-2">
        {/* Amount */}
        <span className="text-sm font-medium tabular-nums">
          {formatCurrency(bill.amount)}
        </span>

        {/* Actions */}
        <div className="flex items-center gap-0.5 opacity-0 group-hover/bill:opacity-100 transition-opacity">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit(bill);
            }}
            className="p-1 rounded hover:bg-muted"
            title="Editar conta"
          >
            <Pencil className="h-3 w-3 text-muted-foreground" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(bill);
            }}
            className="p-1 rounded hover:bg-destructive/10"
            title="Excluir conta"
          >
            <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" />
          </button>
        </div>
      </div>
    </div>
  );
}
