'use client';

import { useState } from 'react';
import { ChevronDown, Plus, Pencil, Trash2 } from 'lucide-react';
import { Checkbox } from '@/shared/ui/checkbox';
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
import { toast } from 'sonner';
import { RecurringBillItem } from './recurring-bill-item';
import { UnifiedExpenseForm } from '@/features/expenses';

interface Account {
  id: string;
  name: string;
  type: string;
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

interface Category {
  id: string;
  name: string;
  icon?: string | null;
  behavior: 'set_aside' | 'refill_up';
  plannedAmount: number;
}

interface CategoryAllocation {
  category: Category;
  allocated: number;
  carriedOver: number;
  spent: number;
  available: number;
  isOtherMemberCategory?: boolean;
  recurringBills?: RecurringBillSummary[];
}

interface CategoryWithBillsProps {
  item: CategoryAllocation;
  budgetId: string;
  accounts: Account[];
  isSelected: boolean;
  onToggleSelection: () => void;
  onEditAllocation: (category: Category, allocated: number) => void;
  onEditCategory: (category: Category) => void;
  onDeleteCategory: (category: Category) => void;
  onBillsChange: () => void;
}

export function CategoryWithBills({
  item,
  budgetId,
  accounts,
  isSelected,
  onToggleSelection,
  onEditAllocation,
  onEditCategory,
  onDeleteCategory,
  onBillsChange,
}: CategoryWithBillsProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isBillFormOpen, setIsBillFormOpen] = useState(false);
  const [editingBill, setEditingBill] = useState<RecurringBillSummary | null>(null);
  const [deletingBill, setDeletingBill] = useState<RecurringBillSummary | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const hasBills = item.recurringBills && item.recurringBills.length > 0;

  const handleAddBill = (e: React.MouseEvent) => {
    e.stopPropagation();
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

  // If category has bills, it becomes expandable
  const isExpandable = hasBills;

  const handleCategoryClick = () => {
    if (isExpandable) {
      setIsExpanded(!isExpanded);
    } else {
      onEditAllocation(item.category, item.allocated);
    }
  };

  return (
    <>
      {/* Category Row */}
      <div
        className={cn(
          'group/row grid grid-cols-[24px_1fr_100px_100px_110px] px-4 py-1.5 items-center border-b hover:bg-muted/20 text-sm cursor-pointer',
          isSelected && 'bg-primary/5'
        )}
        onClick={handleCategoryClick}
        data-tutorial="category-row"
      >
        <Checkbox
          checked={isSelected}
          className="h-3.5 w-3.5"
          onCheckedChange={onToggleSelection}
          onClick={(e) => e.stopPropagation()}
        />
        <div className="flex items-center gap-1.5 pl-5">
          {/* Expand/Collapse chevron for categories with bills */}
          {isExpandable && (
            <ChevronDown
              className={cn(
                'h-3 w-3 text-muted-foreground transition-transform shrink-0',
                !isExpanded && '-rotate-90'
              )}
            />
          )}
          {!isExpandable && <div className="w-3" />}

          <span>{item.category.icon || '📌'}</span>
          <span className="truncate">{item.category.name}</span>

          {/* Bill count badge */}
          {hasBills && (
            <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full ml-1">
              {item.recurringBills!.length}
            </span>
          )}

          {/* Actions */}
          <div className="flex items-center gap-0.5 ml-1 opacity-0 group-hover/row:opacity-100 transition-opacity">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleAddBill(e);
              }}
              className="p-1 rounded hover:bg-muted"
              title="Adicionar conta recorrente"
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
        <div className="text-right text-xs tabular-nums">
          {formatCurrency(item.allocated)}
        </div>
        <div className="text-right text-xs tabular-nums">
          {formatCurrency(item.spent)}
        </div>
        <div
          className={cn(
            'text-right text-xs tabular-nums font-medium px-1',
            item.available > 0
              ? 'text-green-600'
              : item.available < 0
                ? 'text-red-600 bg-red-100 dark:bg-red-900/30 rounded'
                : ''
          )}
        >
          {formatCurrency(item.available)}
        </div>
      </div>

      {/* Expanded Bills List */}
      {isExpanded && hasBills && (
        <div className="border-b bg-muted/10">
          <div className="pl-14 pr-4 py-2 space-y-0.5">
            {item.recurringBills!.map((bill) => (
              <RecurringBillItem
                key={bill.id}
                bill={bill}
                onEdit={handleEditBill}
                onDelete={setDeletingBill}
              />
            ))}
            {/* Add bill button */}
            <button
              onClick={handleAddBill}
              className="flex items-center gap-2 py-1.5 px-2 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-md w-full transition-colors"
            >
              <Plus className="h-3 w-3" />
              Adicionar conta
            </button>
          </div>
        </div>
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
