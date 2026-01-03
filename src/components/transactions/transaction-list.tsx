'use client';

import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { TrendingUp, TrendingDown, ArrowLeftRight, Receipt, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  COMPACT_TABLE_STYLES,
  GroupToggleRow,
  HoverActions,
} from '@/components/ui/compact-table';
import { cn } from '@/lib/utils';
import { formatCurrencyCompact } from '@/lib/formatters';
import type { TransactionWithRelations } from '@/types';

const GRID_COLS = '24px 1fr 120px 120px 100px';

interface TransactionListProps {
  groupedTransactions: Map<string, TransactionWithRelations[]>;
  sortedDates: string[];
  isExpanded: (key: string) => boolean;
  toggleGroup: (key: string) => void;
  onEdit: (transaction: TransactionWithRelations) => void;
  onDelete: (transaction: TransactionWithRelations) => void;
  onCreateNew: () => void;
}

function getTypeIcon(type: string) {
  switch (type) {
    case 'income':
      return <TrendingUp className="h-3.5 w-3.5 text-green-500" />;
    case 'expense':
      return <TrendingDown className="h-3.5 w-3.5 text-red-500" />;
    case 'transfer':
      return <ArrowLeftRight className="h-3.5 w-3.5 text-blue-500" />;
    default:
      return null;
  }
}

export function TransactionList({
  groupedTransactions,
  sortedDates,
  isExpanded,
  toggleGroup,
  onEdit,
  onDelete,
  onCreateNew,
}: TransactionListProps) {
  if (sortedDates.length === 0) {
    return (
      <div className="rounded-lg border border-dashed bg-card p-8 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
          <Receipt className="h-6 w-6 text-muted-foreground" />
        </div>
        <h3 className="font-semibold">Nenhuma transação ainda</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Comece registrando sua primeira transação para acompanhar suas finanças
        </p>
        <Button className="mt-4" onClick={onCreateNew}>
          <Plus className="mr-2 h-4 w-4" />
          Adicionar Transação
        </Button>
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-card">
      {/* Table Header */}
      <div
        className={COMPACT_TABLE_STYLES.header}
        style={{ gridTemplateColumns: GRID_COLS }}
      >
        <div></div>
        <div>Descrição</div>
        <div>Categoria</div>
        <div>Conta</div>
        <div className="text-right">Valor</div>
      </div>

      {/* Grouped by Date */}
      {sortedDates.map((dateKey) => {
        const dayTransactions = groupedTransactions.get(dateKey) || [];
        const expanded = isExpanded(dateKey);
        const dayTotal = dayTransactions.reduce((sum, t) => {
          if (t.type === 'income') return sum + t.amount;
          if (t.type === 'expense') return sum - t.amount;
          return sum;
        }, 0);

        return (
          <div key={dateKey}>
            <GroupToggleRow
              isExpanded={expanded}
              onToggle={() => toggleGroup(dateKey)}
              icon="📅"
              label={format(new Date(dateKey), "EEEE, dd 'de' MMMM", { locale: ptBR })}
              count={dayTransactions.length}
              gridCols={GRID_COLS}
              emptyColsCount={2}
              summary={
                <>
                  {dayTotal >= 0 ? '+' : ''}
                  {formatCurrencyCompact(dayTotal)}
                </>
              }
              summaryClassName={dayTotal >= 0 ? 'text-green-600' : 'text-red-600'}
            />

            {/* Transaction Rows */}
            {expanded &&
              dayTransactions.map((transaction) => (
                <TransactionRow
                  key={transaction.id}
                  transaction={transaction}
                  onEdit={() => onEdit(transaction)}
                  onDelete={() => onDelete(transaction)}
                />
              ))}
          </div>
        );
      })}
    </div>
  );
}

interface TransactionRowProps {
  transaction: TransactionWithRelations;
  onEdit: () => void;
  onDelete: () => void;
}

function TransactionRow({ transaction, onEdit, onDelete }: TransactionRowProps) {
  return (
    <div
      className={COMPACT_TABLE_STYLES.itemRow}
      style={{ gridTemplateColumns: GRID_COLS }}
    >
      <div className="flex items-center justify-center">
        {getTypeIcon(transaction.type)}
      </div>
      <div className="flex items-center gap-2 min-w-0">
        <span className="truncate font-medium">
          {transaction.description || 'Sem descrição'}
        </span>
        {transaction.isInstallment &&
          transaction.installmentNumber &&
          transaction.totalInstallments && (
            <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
              {transaction.installmentNumber}/{transaction.totalInstallments}
            </span>
          )}
        <HoverActions
          onEdit={onEdit}
          onDelete={onDelete}
          editTitle="Editar transação"
          deleteTitle="Excluir transação"
        />
      </div>
      <div className="flex items-center gap-1.5 text-muted-foreground truncate">
        {transaction.category ? (
          <>
            <span>{transaction.category.icon || '📌'}</span>
            <span className="truncate">{transaction.category.name}</span>
          </>
        ) : (
          <span className="text-xs">Sem categoria</span>
        )}
      </div>
      <div className="flex items-center gap-1.5 text-muted-foreground truncate">
        {transaction.account ? (
          <>
            <span>{transaction.account.icon || '🏦'}</span>
            <span className="truncate">{transaction.account.name}</span>
          </>
        ) : (
          <span className="text-xs">-</span>
        )}
      </div>
      <div
        className={cn(
          'text-right font-medium tabular-nums',
          transaction.type === 'income'
            ? 'text-green-600'
            : transaction.type === 'expense'
              ? 'text-red-600'
              : 'text-blue-600'
        )}
      >
        {transaction.type === 'expense' && '-'}
        {transaction.type === 'income' && '+'}
        {formatCurrencyCompact(Math.abs(transaction.amount))}
      </div>
    </div>
  );
}
