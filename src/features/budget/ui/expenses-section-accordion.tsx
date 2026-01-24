'use client';

import { ChevronDown, Plus } from 'lucide-react';
import { Checkbox } from '@/shared/ui/checkbox';
import { cn } from '@/shared/lib/utils';
import { CategoryWithBills } from './category-with-bills';
import { formatCurrency } from '../types';

// Local types that match what the budget page provides
type FilterType = 'all' | 'underfunded' | 'overfunded' | 'money_available';

interface CategoryLocal {
  id: string;
  name: string;
  icon?: string | null;
  behavior: 'set_aside' | 'refill_up';
  plannedAmount: number;
}

interface RecurringBillSummaryLocal {
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

interface CategoryAllocationLocal {
  category: CategoryLocal;
  allocated: number;
  carriedOver: number;
  spent: number;
  available: number;
  isOtherMemberCategory?: boolean;
  recurringBills?: RecurringBillSummaryLocal[];
}

interface GroupLocal {
  id: string;
  code: string;
  name: string;
  icon?: string | null;
  displayOrder: number;
}

interface GroupDataLocal {
  group: GroupLocal;
  categories: CategoryAllocationLocal[];
  totals: {
    allocated: number;
    spent: number;
    available: number;
  };
}

interface AccountLocal {
  id: string;
  name: string;
  type: string;
  icon?: string | null;
}

interface ExpensesSectionAccordionProps {
  groupsData: GroupDataLocal[];
  totals: { allocated: number; spent: number; available: number };
  budgetId: string;
  accounts: AccountLocal[];
  isExpanded: boolean;
  onToggle: () => void;
  expandedGroups: string[];
  onToggleGroup: (groupId: string) => void;
  activeFilter: FilterType;
  selectedCategories: string[];
  onToggleCategorySelection: (categoryId: string) => void;
  onToggleGroupSelection: (groupId: string) => void;
  onEditAllocation: (category: CategoryLocal, allocated: number) => void;
  onEditCategory: (category: CategoryLocal) => void;
  onDeleteCategory: (category: CategoryLocal) => void;
  onAddCategory: (groupId: string, groupCode: string) => void;
  onBillsChange: () => void;
}

export function ExpensesSectionAccordion({
  groupsData,
  totals,
  budgetId,
  accounts,
  isExpanded,
  onToggle,
  expandedGroups,
  onToggleGroup,
  activeFilter,
  selectedCategories,
  onToggleCategorySelection,
  onToggleGroupSelection,
  onEditAllocation,
  onEditCategory,
  onDeleteCategory,
  onAddCategory,
  onBillsChange,
}: ExpensesSectionAccordionProps) {
  const filterCategories = (categories: CategoryAllocationLocal[]): CategoryAllocationLocal[] => {
    switch (activeFilter) {
      case 'underfunded':
        return categories.filter(
          (c) =>
            c.allocated === 0 ||
            (c.category.plannedAmount > 0 && c.allocated < c.category.plannedAmount)
        );
      case 'overfunded':
        return categories.filter((c) => c.available > c.allocated && c.allocated > 0);
      case 'money_available':
        return categories.filter((c) => c.available > 0);
      default:
        return categories;
    }
  };

  if (groupsData.length === 0) {
    return null;
  }

  return (
    <>
      {/* Expenses Section Header - Clickable Toggle */}
      <div
        className="px-4 py-2 bg-red-100 dark:bg-red-950/50 border-b flex items-center justify-between cursor-pointer hover:bg-red-200/50 dark:hover:bg-red-950/70 transition-colors"
        onClick={onToggle}
      >
        <div className="flex items-center gap-2">
          <ChevronDown
            className={cn(
              'h-4 w-4 text-red-700 dark:text-red-300 transition-transform',
              !isExpanded && '-rotate-90'
            )}
          />
          <span className="text-lg">💸</span>
          <span className="font-bold text-sm text-red-800 dark:text-red-200">
            DESPESAS
          </span>
        </div>
        <div className="flex items-center gap-4 text-sm font-bold text-red-800 dark:text-red-200">
          <span className="text-xs text-muted-foreground font-normal">
            Planejado:
          </span>
          <span>{formatCurrency(totals.allocated)}</span>
          <span className="text-xs text-muted-foreground font-normal">
            Realizado:
          </span>
          <span className="text-red-600 dark:text-red-400">
            {formatCurrency(totals.spent)}
          </span>
          <span className="text-xs text-muted-foreground font-normal">
            Disponivel:
          </span>
          <span className={totals.allocated - totals.spent >= 0 ? '' : 'text-red-600'}>
            {formatCurrency(totals.allocated - totals.spent)}
          </span>
        </div>
      </div>

      {isExpanded && (
        <div className="overflow-x-auto">
          <div className="min-w-[550px]">
            {/* Expenses Table Header */}
            <div className="grid grid-cols-[24px_1fr_100px_100px_100px] px-4 py-1.5 text-[11px] font-medium text-muted-foreground uppercase border-b bg-muted/50">
              <div />
              <div>Categoria</div>
              <div className="text-right">Planejado</div>
              <div className="text-right">Realizado</div>
              <div className="text-right">Disponivel</div>
            </div>
          </div>
        </div>
      )}

      {isExpanded && (
        <div className="overflow-x-auto">
          <div className="min-w-[550px]">
            {groupsData.map(({ group, categories, totals: groupTotals }) => {
              const isGroupExpanded = expandedGroups.includes(group.id);
              const filteredCategories = filterCategories(categories);
              const categoryIds = categories.map((c) => c.category.id);
              const allSelected =
                categoryIds.length > 0 &&
                categoryIds.every((id) => selectedCategories.includes(id));
              const someSelected = categoryIds.some((id) =>
                selectedCategories.includes(id)
              );

              if (activeFilter !== 'all' && filteredCategories.length === 0) {
                return null;
              }

              return (
                <div key={group.id}>
                  {/* Group Row */}
                  <div
                    className="group grid grid-cols-[24px_1fr_100px_100px_100px] px-4 py-1.5 items-center bg-muted/40 border-b cursor-pointer hover:bg-muted/60 text-sm"
                    onClick={() => onToggleGroup(group.id)}
                  >
                    <Checkbox
                      checked={allSelected}
                      className={cn(
                        'h-3.5 w-3.5',
                        someSelected && !allSelected && 'opacity-50'
                      )}
                      onCheckedChange={() => onToggleGroupSelection(group.id)}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <div className="flex items-center gap-1.5">
                      <ChevronDown
                        className={cn(
                          'h-3.5 w-3.5 transition-transform',
                          !isGroupExpanded && '-rotate-90'
                        )}
                      />
                      <span>{group.icon}</span>
                      <span className="font-bold">{group.name}</span>
                      <button
                        className="ml-1 p-0.5 rounded hover:bg-muted/80 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => {
                          e.stopPropagation();
                          onAddCategory(group.id, group.code);
                        }}
                        title="Adicionar categoria"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <div className="text-right text-xs tabular-nums font-bold">
                      {formatCurrency(groupTotals.allocated)}
                    </div>
                    <div className="text-right text-xs tabular-nums font-bold">
                      {formatCurrency(groupTotals.spent)}
                    </div>
                    <div
                      className={cn(
                        'text-right text-xs tabular-nums font-bold',
                        groupTotals.available >= 0 ? 'text-green-600' : 'text-red-600'
                      )}
                    >
                      {formatCurrency(groupTotals.available)}
                    </div>
                  </div>

                  {/* Categories */}
                  {isGroupExpanded &&
                    filteredCategories.map((item) => {
                      const isSelected = selectedCategories.includes(item.category.id);
                      const isOtherMember = item.isOtherMemberCategory;

                      // For other member categories, show simple read-only row
                      if (isOtherMember) {
                        return (
                          <div
                            key={item.category.id}
                            className="grid grid-cols-[24px_1fr_100px_100px_100px] px-4 py-1.5 items-center border-b text-sm opacity-75 cursor-default"
                            data-tutorial="category-row"
                          >
                            <div className="h-3.5 w-3.5" />
                            <div className="flex items-center gap-1.5 pl-5">
                              <span>{item.category.icon || '📌'}</span>
                              <span>{item.category.name}</span>
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
                        );
                      }

                      // For own categories, use CategoryWithBills component
                      return (
                        <CategoryWithBills
                          key={item.category.id}
                          item={item}
                          budgetId={budgetId}
                          accounts={accounts}
                          isSelected={isSelected}
                          onToggleSelection={() =>
                            onToggleCategorySelection(item.category.id)
                          }
                          onEditAllocation={onEditAllocation}
                          onEditCategory={onEditCategory}
                          onDeleteCategory={onDeleteCategory}
                          onBillsChange={onBillsChange}
                        />
                      );
                    })}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}
