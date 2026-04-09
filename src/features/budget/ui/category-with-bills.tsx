'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { ChevronDown, Plus, Pencil, Trash2, MoreVertical, DollarSign } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/shared/ui/alert-dialog';
import { formatCurrency } from '@/shared/lib/formatters';
import { cn } from '@/shared/lib/utils';
import { AccordionContent } from '@/shared/ui/accordion-content';
import { toast } from 'sonner';
import { RecurringBillItem } from './recurring-bill-item';
import { CategoryTransactionItem, type CategoryTransaction } from './category-transaction-item';
import { UnifiedExpenseForm } from '@/features/expenses';
import { useTransactionCacheInvalidation } from '@/features/transactions/hooks/use-transaction-cache-invalidation';
import type {
  Category,
  CategoryAllocation,
  RecurringBillSummary,
  Account,
} from '../types';
import type { MobileViewMode } from '../hooks';

interface CategoryWithBillsProps {
  item: CategoryAllocation;
  budgetId: string;
  accounts: Account[];
  year: number;
  month: number;
  onEditAllocation: (category: Category, allocated: number) => void;
  onEditCategory: (category: Category) => void;
  onDeleteCategory: (category: Category) => void;
  onBillsChange: () => void;
  mobileViewMode?: MobileViewMode;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
}

// Helper to get the value based on view mode for expenses
function getCategoryDisplayValue(
  allocated: number,
  pending: number,
  confirmed: number,
  saldo: number,
  mode: MobileViewMode
): { value: number; colorClass: string } {
  switch (mode) {
    case 'planned':
      return { value: allocated, colorClass: '' };
    case 'pending':
      return { value: pending, colorClass: pending > 0 ? 'text-amber-600' : '' };
    case 'actual':
      return { value: confirmed, colorClass: '' };
    case 'saldo':
    default:
      return {
        value: saldo,
        colorClass: saldo > 0 ? 'text-green-600' : saldo < 0 ? 'text-red-600' : '',
      };
  }
}

export function CategoryWithBills({
  item,
  budgetId,
  accounts,
  year,
  month,
  onEditAllocation,
  onEditCategory,
  onDeleteCategory,
  onBillsChange,
  mobileViewMode = 'saldo',
  isExpanded: controlledExpanded,
  onToggleExpand,
}: CategoryWithBillsProps) {
  const [localExpanded, setLocalExpanded] = useState(false);
  const isExpanded = controlledExpanded ?? localExpanded;
  const [isBillFormOpen, setIsBillFormOpen] = useState(false);
  const [editingBill, setEditingBill] = useState<RecurringBillSummary | null>(null);
  const [deletingBill, setDeletingBill] = useState<RecurringBillSummary | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const invalidateCaches = useTransactionCacheInvalidation();

  // Fetch transactions for this category (only when expanded)
  const startDate = new Date(year, month - 1, 1).toISOString();
  const endDate = new Date(year, month, 0, 23, 59, 59).toISOString();
  const txKey = isExpanded
    ? `/api/app/transactions?budgetId=${budgetId}&categoryId=${item.category.id}&startDate=${startDate}&endDate=${endDate}&limit=200`
    : null;
  const { data: txData, mutate: mutateTxList } = useSWR<{ transactions: CategoryTransaction[] }>(txKey);
  const categoryTransactions = txData?.transactions ?? [];

  const refetchAfterTxChange = async () => {
    invalidateCaches();
    await mutateTxList();
    onBillsChange();
  };

  const handleConfirmTransaction = async (id: string) => {
    try {
      const res = await fetch(`/api/app/transactions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'cleared' }),
      });
      if (!res.ok) throw new Error();
      toast.success('Transação confirmada!');
      await refetchAfterTxChange();
    } catch {
      toast.error('Erro ao confirmar transação');
    }
  };

  const handleRevertTransaction = async (id: string) => {
    try {
      const res = await fetch(`/api/app/transactions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'pending' }),
      });
      if (!res.ok) throw new Error();
      toast.success('Voltou para pendente');
      await refetchAfterTxChange();
    } catch {
      toast.error('Erro ao reverter transação');
    }
  };

  const handleDeleteTransaction = async (id: string) => {
    try {
      const res = await fetch(`/api/app/transactions/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      toast.success('Transação excluída');
      await refetchAfterTxChange();
    } catch {
      toast.error('Erro ao excluir transação');
    }
  };

  const hasBills = item.recurringBills && item.recurringBills.length > 0;
  const hasCategoryTransactions = categoryTransactions.length > 0;

  const handleAddBill = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setEditingBill(null);
    setIsBillFormOpen(true);
  };

  const handleEditBill = (bill: RecurringBillSummary) => {
    setEditingBill(bill);
    setIsBillFormOpen(true);
  };

  const handleDeleteBill = async () => {
    if (!deletingBill) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/app/recurring-bills/${deletingBill.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao excluir conta');
      }

      toast.success('Conta excluída!');
      setDeletingBill(null);
      onBillsChange();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao excluir conta');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleBillFormSuccess = () => {
    setIsBillFormOpen(false);
    setEditingBill(null);
    onBillsChange();
  };

  // Category is expandable if it has bills OR has any transactions in the period
  const isExpandable = hasBills || item.pending > 0 || item.confirmed > 0;

  const handleToggleExpand = () => {
    if (onToggleExpand) {
      onToggleExpand();
    } else {
      setLocalExpanded(!localExpanded);
    }
  };

  const handleCategoryClick = () => {
    onEditAllocation(item.category, item.allocated);
  };

  return (
    <>
      {/* Category Row */}
      <div
        className={cn(
          'group/row grid grid-cols-[16px_1fr_80px_24px] sm:grid-cols-[24px_1fr_85px_85px_85px_90px] px-3 sm:px-4 py-1.5 items-center border-b hover:bg-muted/20 text-sm cursor-pointer'
        )}
        onClick={handleCategoryClick}
        data-tutorial="category-row"
      >
        <div className="flex items-center justify-center">
          {/* Expand/Collapse chevron for categories with bills */}
          {isExpandable ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleToggleExpand();
              }}
              className="p-1 -m-1 rounded hover:bg-muted"
            >
              <ChevronDown
                className={cn(
                  'h-3 w-3 text-muted-foreground transition-transform duration-200 shrink-0',
                  !isExpanded && '-rotate-90'
                )}
              />
            </button>
          ) : (
            <div className="w-3 shrink-0" />
          )}
        </div>
        <div className="flex items-center gap-1 sm:gap-1.5 pl-1 sm:pl-3 min-w-0">
          <span className="shrink-0">{item.category.icon || '📌'}</span>
          <span className="truncate">{item.category.name}</span>

          {/* Bill count badge */}
          {hasBills && (
            <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full shrink-0">
              {item.recurringBills!.length}
            </span>
          )}

          {/* Desktop: Actions visible on hover */}
          <div className="hidden sm:flex items-center gap-0.5 ml-1 opacity-0 group-hover/row:opacity-100 transition-opacity shrink-0">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleAddBill(e);
              }}
              className="p-1 rounded hover:bg-muted"
              title="Adicionar despesa fixa"
            >
              <Plus className="h-3 w-3 text-muted-foreground" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEditCategory(item.category);
              }}
              className="p-1 rounded hover:bg-muted"
              title="Editar categoria"
            >
              <Pencil className="h-3 w-3 text-muted-foreground" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDeleteCategory(item.category);
              }}
              className="p-1 rounded hover:bg-destructive/10"
              title="Excluir categoria"
            >
              <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" />
            </button>
          </div>
        </div>

        {/* Desktop: Planejado */}
        <div className="hidden sm:block text-xs tabular-nums text-right pr-2">
          {formatCurrency(item.allocated)}
        </div>
        {/* Desktop: Pendente */}
        <div className={cn(
          "hidden sm:block text-xs tabular-nums text-right pr-2",
          item.pending > 0 && "text-amber-600"
        )}>
          {formatCurrency(item.pending)}
        </div>
        {/* Desktop: Realizado */}
        <div className="hidden sm:block text-xs tabular-nums text-right pr-2">
          {formatCurrency(item.confirmed)}
        </div>
        {/* Desktop: Saldo */}
        <div
          className={cn(
            'hidden sm:block text-xs tabular-nums font-medium text-right pr-2',
            item.saldo > 0
              ? 'text-green-600'
              : item.saldo < 0
                ? 'text-red-600'
                : ''
          )}
        >
          {formatCurrency(item.saldo)}
        </div>

        {/* Mobile: show based on view mode */}
        {(() => {
          const display = getCategoryDisplayValue(
            item.allocated,
            item.pending,
            item.confirmed,
            item.saldo,
            mobileViewMode
          );
          return (
            <div className={cn('sm:hidden text-xs tabular-nums font-medium pr-2', display.colorClass)}>
              {formatCurrency(display.value)}
            </div>
          );
        })()}

        {/* Mobile: 3-dot menu at far right */}
        <div className="sm:hidden flex items-center justify-center">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="p-2 -m-1 rounded hover:bg-muted"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreVertical className="h-4 w-4 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onSelect={() => setTimeout(() => onEditAllocation(item.category, item.allocated), 0)}
              >
                <DollarSign className="h-4 w-4 mr-2" />
                Editar alocação
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setTimeout(() => handleAddBill(), 0)}>
                <Plus className="h-4 w-4 mr-2" />
                Adicionar despesa fixa
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => setTimeout(() => onEditCategory(item.category), 0)}>
                <Pencil className="h-4 w-4 mr-2" />
                Editar categoria
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() => setTimeout(() => onDeleteCategory(item.category), 0)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Excluir categoria
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Expanded content: Bills + Transactions */}
      {isExpandable && (
        <AccordionContent isOpen={isExpanded}>
          <div className="border-b bg-muted/10">
            <div className="pl-14 pr-4 py-2 space-y-0.5">
              {/* Recurring Bills */}
              {hasBills && (
                <>
                  {item.recurringBills!.map((bill) => (
                    <RecurringBillItem
                      key={bill.id}
                      bill={bill}
                      onEdit={handleEditBill}
                      onDelete={setDeletingBill}
                    />
                  ))}
                  <button
                    onClick={handleAddBill}
                    className="flex items-center gap-2 py-1.5 px-2 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-md w-full transition-colors"
                  >
                    <Plus className="h-3 w-3" />
                    Adicionar despesa fixa
                  </button>
                </>
              )}

              {/* Transactions in this category */}
              {hasCategoryTransactions && (
                <div className={hasBills ? 'mt-2 pt-2 border-t' : ''}>
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide px-2 py-1">
                    Transações do mês
                  </p>
                  <div className="space-y-0.5">
                    {categoryTransactions.map((tx) => (
                      <CategoryTransactionItem
                        key={tx.id}
                        transaction={tx}
                        onConfirm={handleConfirmTransaction}
                        onRevert={handleRevertTransaction}
                        onDelete={handleDeleteTransaction}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Add bill CTA when no bills but has transactions */}
              {!hasBills && hasCategoryTransactions && (
                <button
                  onClick={handleAddBill}
                  className="flex items-center gap-2 py-1.5 px-2 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-md w-full transition-colors mt-1"
                >
                  <Plus className="h-3 w-3" />
                  Adicionar despesa fixa
                </button>
              )}
            </div>
          </div>
        </AccordionContent>
      )}

      {/* Bill Form Modal */}
      <UnifiedExpenseForm
        isOpen={isBillFormOpen}
        onClose={() => {
          setIsBillFormOpen(false);
          setEditingBill(null);
        }}
        onSuccess={handleBillFormSuccess}
        budgetId={budgetId}
        accounts={accounts}
        categories={[{ id: item.category.id, name: item.category.name, icon: item.category.icon }]}
        defaultCategoryId={item.category.id}
        defaultIsRecurring={true}
        editingBill={editingBill ? {
          id: editingBill.id,
          name: editingBill.name,
          amount: editingBill.amount,
          frequency: editingBill.frequency as 'weekly' | 'monthly' | 'yearly',
          dueDay: editingBill.dueDay,
          dueMonth: editingBill.dueMonth,
          accountId: editingBill.account?.id || accounts[0]?.id || '',
          isAutoDebit: editingBill.isAutoDebit ?? false,
          isVariable: editingBill.isVariable ?? false,
          startDate: editingBill.startDate ? new Date(editingBill.startDate).toISOString() : null,
          endDate: editingBill.endDate ? new Date(editingBill.endDate).toISOString() : null,
        } : null}
      />

      {/* Delete Bill Confirmation */}
      <AlertDialog open={!!deletingBill} onOpenChange={(open) => !open && setDeletingBill(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir conta?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a conta &quot;{deletingBill?.name}&quot;?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteBill}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
