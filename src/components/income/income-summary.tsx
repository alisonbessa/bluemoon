'use client';

import { Wallet } from 'lucide-react';
import { formatCentsToCurrency } from '@/components/ui/currency-input';

interface IncomeSummaryProps {
  totalMonthlyIncome: number;
  sourceCount: number;
}

export function IncomeSummary({
  totalMonthlyIncome,
  sourceCount,
}: IncomeSummaryProps) {
  return (
    <div className="grid grid-cols-2 gap-4" data-tutorial="income-summary">
      <div className="rounded-lg border bg-card p-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Wallet className="h-4 w-4 text-green-500" />
          <span>Renda Mensal Total</span>
        </div>
        <div className="mt-1 text-xl font-bold text-green-600">
          {formatCentsToCurrency(totalMonthlyIncome)}
        </div>
      </div>

      <div className="rounded-lg border bg-card p-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="text-lg">💰</span>
          <span>Fontes de Renda</span>
        </div>
        <div className="mt-1 text-xl font-bold">{sourceCount}</div>
      </div>
    </div>
  );
}
