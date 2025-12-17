'use client';

import { Receipt, TrendingUp, TrendingDown } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { formatCurrency } from '@/lib/formatters';
import { cn } from '@/lib/utils';

interface TransactionSummaryProps {
  totalIncome: number;
  totalExpenses: number;
  date?: Date;
}

export function TransactionSummary({
  totalIncome,
  totalExpenses,
  date = new Date(),
}: TransactionSummaryProps) {
  const balance = totalIncome - totalExpenses;
  const monthName = format(date, 'MMM', { locale: ptBR });

  return (
    <div className="grid grid-cols-3 gap-4">
      <div className="rounded-lg border bg-card p-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <TrendingUp className="h-4 w-4 text-green-500" />
          <span>Receitas ({monthName})</span>
        </div>
        <div className="mt-1 text-xl font-bold text-green-600">
          {formatCurrency(totalIncome)}
        </div>
      </div>

      <div className="rounded-lg border bg-card p-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <TrendingDown className="h-4 w-4 text-red-500" />
          <span>Despesas ({monthName})</span>
        </div>
        <div className="mt-1 text-xl font-bold text-red-600">
          {formatCurrency(totalExpenses)}
        </div>
      </div>

      <div className="rounded-lg border bg-card p-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Receipt className="h-4 w-4" />
          <span>Saldo ({monthName})</span>
        </div>
        <div
          className={cn(
            'mt-1 text-xl font-bold',
            balance >= 0 ? 'text-green-600' : 'text-red-600'
          )}
        >
          {formatCurrency(balance)}
        </div>
      </div>
    </div>
  );
}
