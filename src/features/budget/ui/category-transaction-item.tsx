'use client';

import { Button } from '@/shared/ui/button';
import { Check, Undo2, Trash2 } from 'lucide-react';
import { formatCurrencyCompact, parseLocalDate } from '@/shared/lib/formatters';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/shared/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/shared/ui/tooltip';

export interface CategoryTransaction {
  id: string;
  description?: string | null;
  amount: number;
  type: 'income' | 'expense' | 'transfer';
  status: 'pending' | 'cleared' | 'reconciled';
  date: string;
  account?: { id: string; name: string; icon?: string | null } | null;
  isInstallment?: boolean | null;
  installmentNumber?: number | null;
  totalInstallments?: number | null;
}

interface CategoryTransactionItemProps {
  transaction: CategoryTransaction;
  onConfirm: (id: string) => void;
  onRevert: (id: string) => void;
  onDelete: (id: string) => void;
}

export function CategoryTransactionItem({
  transaction: tx,
  onConfirm,
  onRevert,
  onDelete,
}: CategoryTransactionItemProps) {
  const isPending = tx.status === 'pending';

  return (
    <div
      className={cn(
        'flex items-center gap-2 px-2 py-1.5 rounded text-xs hover:bg-muted/40',
        isPending && 'bg-amber-50/50 dark:bg-amber-950/20 border-l-2 border-amber-500'
      )}
    >
      {/* Description + date */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="truncate">{tx.description || 'Sem descrição'}</span>
          {tx.isInstallment && tx.installmentNumber && tx.totalInstallments && (
            <span className="shrink-0 text-[10px] text-muted-foreground bg-muted px-1 py-0.5 rounded">
              {tx.installmentNumber}/{tx.totalInstallments}
            </span>
          )}
          {isPending && (
            <span className="shrink-0 px-1 py-0.5 text-[9px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400 rounded uppercase tracking-wide">
              Pendente
            </span>
          )}
        </div>
        <span className="text-[10px] text-muted-foreground">
          {format(parseLocalDate(tx.date), 'dd MMM', { locale: ptBR })}
          {tx.account?.name && ` · ${tx.account.name}`}
        </span>
      </div>

      {/* Amount */}
      <span className={cn(
        "tabular-nums font-medium",
        isPending ? "text-amber-600" : "text-red-600"
      )}>
        -{formatCurrencyCompact(Math.abs(tx.amount))}
      </span>

      {/* Quick actions */}
      <div className="flex items-center gap-0.5">
        {isPending ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-green-600 hover:text-green-700"
                onClick={(e) => {
                  e.stopPropagation();
                  onConfirm(tx.id);
                }}
              >
                <Check className="h-3 w-3" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Confirmar</TooltipContent>
          </Tooltip>
        ) : (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-amber-600 hover:text-amber-700"
                onClick={(e) => {
                  e.stopPropagation();
                  onRevert(tx.id);
                }}
              >
                <Undo2 className="h-3 w-3" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Voltar para pendente</TooltipContent>
          </Tooltip>
        )}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-muted-foreground hover:text-destructive"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(tx.id);
              }}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Excluir</TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}
