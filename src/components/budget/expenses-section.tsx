'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ChevronDown, Plus, Pencil, Trash2, PiggyBank } from 'lucide-react';
import { formatCurrency } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import type { GroupData, CategoryAllocation, Category, FilterType } from '@/types/category';
import { GROUP_DEFAULT_BEHAVIORS } from '@/types/category';

interface ExpensesSectionProps {
  groupsData: GroupData[];
  totals: { allocated: number; spent: number; available: number };
  isExpanded: boolean;
  expandedGroups: string[];
  selectedCategories: string[];
  activeFilter: FilterType;
  onToggleExpanded: () => void;
  onToggleGroup: (groupId: string) => void;
  onToggleCategorySelection: (categoryId: string) => void;
  onToggleGroupSelection: (groupId: string) => void;
  onEditAllocation: (category: Category, allocated: number) => void;
  onAddCategory: (groupId: string, groupCode: string) => void;
  onEditCategory: (category: Category) => void;
  onDeleteCategory: (category: Category) => void;
}

export function ExpensesSection({
  groupsData,
  totals,
  isExpanded,
  expandedGroups,
  selectedCategories,
  activeFilter,
  onToggleExpanded,
  onToggleGroup,
  onToggleCategorySelection,
  onToggleGroupSelection,
  onEditAllocation,
  onAddCategory,
  onEditCategory,
  onDeleteCategory,
}: ExpensesSectionProps) {
  const router = useRouter();

  const filterCategories = (
    categories: CategoryAllocation[]
  ): CategoryAllocation[] => {
    switch (activeFilter) {
      case 'underfunded':
        return categories.filter((c) => c.available < 0);
      case 'overfunded':
        return categories.filter(
          (c) => c.available > c.allocated && c.allocated > 0
        );
      case 'money_available':
        return categories.filter((c) => c.available > 0);
      default:
        return categories;
    }
  };

  if (groupsData.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <PiggyBank className="h-12 w-12 text-muted-foreground" />
        <h3 className="font-semibold">Nenhuma categoria configurada</h3>
        <Button onClick={() => router.push('/app/categories/setup')}>
          Configurar Categorias
        </Button>
      </div>
    );
  }

  return (
    <>
      {/* Expenses Section Header */}
      <div
        className="px-4 py-2 bg-red-100 dark:bg-red-950/50 border-b flex items-center justify-between cursor-pointer hover:bg-red-200/50 dark:hover:bg-red-950/70 transition-colors"
        onClick={onToggleExpanded}
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
            Alocado:
          </span>
          <span>{formatCurrency(totals.allocated)}</span>
          <span className="text-xs text-muted-foreground font-normal">
            Gasto:
          </span>
          <span className="text-red-600 dark:text-red-400">
            {formatCurrency(totals.spent)}
          </span>
          <span className="text-xs text-muted-foreground font-normal">
            Disponível:
          </span>
          <span
            className={totals.allocated - totals.spent >= 0 ? '' : 'text-red-600'}
          >
            {formatCurrency(totals.allocated - totals.spent)}
          </span>
        </div>
      </div>

      {isExpanded && (
        <>
          {/* Expenses Table Header */}
          <div className="grid grid-cols-[24px_1fr_100px_100px_110px] px-4 py-1.5 text-[11px] font-medium text-muted-foreground uppercase border-b bg-muted/50">
            <div />
            <div>Categoria</div>
            <div className="text-right">Alocado</div>
            <div className="text-right">Gasto</div>
            <div className="text-right">Disponível</div>
          </div>

          {/* Groups and Categories */}
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
                  className="group grid grid-cols-[24px_1fr_100px_100px_110px] px-4 py-1.5 items-center bg-muted/40 border-b cursor-pointer hover:bg-muted/60 text-sm"
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
                      groupTotals.available >= 0
                        ? 'text-green-600'
                        : 'text-red-600'
                    )}
                  >
                    {formatCurrency(groupTotals.available)}
                  </div>
                </div>

                {/* Categories */}
                {isGroupExpanded &&
                  filteredCategories.map((item) => {
                    const isSelected = selectedCategories.includes(
                      item.category.id
                    );

                    return (
                      <div
                        key={item.category.id}
                        className={cn(
                          'group/row grid grid-cols-[24px_1fr_100px_100px_110px] px-4 py-1.5 items-center border-b hover:bg-muted/20 text-sm cursor-pointer',
                          isSelected && 'bg-primary/5'
                        )}
                        onClick={() =>
                          onEditAllocation(item.category, item.allocated)
                        }
                        data-tutorial="category-row"
                      >
                        <Checkbox
                          checked={isSelected}
                          className="h-3.5 w-3.5"
                          onCheckedChange={() =>
                            onToggleCategorySelection(item.category.id)
                          }
                          onClick={(e) => e.stopPropagation()}
                        />
                        <div className="flex items-center gap-1.5 pl-5">
                          <span>{item.category.icon || '📌'}</span>
                          <span>{item.category.name}</span>
                          <div className="flex items-center gap-0.5 ml-1 opacity-0 group-hover/row:opacity-100 transition-opacity">
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
                    );
                  })}
              </div>
            );
          })}
        </>
      )}
    </>
  );
}
