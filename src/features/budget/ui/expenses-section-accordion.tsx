'use client';

import { useState } from 'react';
import { ChevronDown, Plus, MoreVertical, DollarSign, Pencil } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu';
import { cn } from '@/shared/lib/utils';
import { AccordionContent } from '@/shared/ui/accordion-content';
import { FormModalWrapper } from '@/shared/molecules';
import { CurrencyInput } from '@/shared/ui/currency-input';
import { Label } from '@/shared/ui/label';
import { toast } from 'sonner';
import { CategoryWithBills } from './category-with-bills';
import {
  formatCurrency,
  type Category,
  type GroupData,
  type Account,
} from '../types';
import type { MobileViewMode } from '../hooks';

interface ExpensesSectionAccordionProps {
  groupsData: GroupData[];
  totals: { allocated: number; spent: number; pending: number; confirmed: number; saldo: number; available: number };
  budgetId: string;
  accounts: Account[];
  isExpanded: boolean;
  onToggle: () => void;
  expandedGroups: string[];
  onToggleGroup: (groupId: string) => void;
  onEditAllocation: (category: Category, allocated: number) => void;
  onEditCategory: (category: Category) => void;
  onDeleteCategory: (category: Category) => void;
  onAddCategory: (groupId: string, groupCode: string) => void;
  onBillsChange: () => void;
  mobileViewMode?: MobileViewMode;
  /** Optional section title override (e.g. "Planejamento Compartilhado") */
  sectionTitle?: string;
  year: number;
  month: number;
  onGroupAllocationChange?: () => void;
}

// Helper to get the value based on view mode for expenses
function getExpenseDisplayValue(
  allocated: number,
  pending: number,
  confirmed: number,
  saldo: number,
  mode: MobileViewMode
): { value: number; colorClass: string } {
  switch (mode) {
    case 'planned':
      return { value: allocated, colorClass: 'text-red-800 dark:text-red-200' };
    case 'pending':
      return { value: pending, colorClass: pending > 0 ? 'text-amber-600' : '' };
    case 'actual':
      return { value: confirmed, colorClass: 'text-red-600 dark:text-red-400' };
    case 'saldo':
    default:
      return {
        value: saldo,
        colorClass: saldo >= 0 ? 'text-green-600' : 'text-red-600',
      };
  }
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
  onEditAllocation,
  onEditCategory,
  onDeleteCategory,
  onAddCategory,
  onBillsChange,
  mobileViewMode = 'saldo',
  sectionTitle,
  year,
  month,
  onGroupAllocationChange,
}: ExpensesSectionAccordionProps) {
  const [expandedCategoryId, setExpandedCategoryId] = useState<string | null>(null);
  const [editingGroup, setEditingGroup] = useState<{ id: string; name: string; currentAlloc: number | null } | null>(null);
  const [groupAllocValue, setGroupAllocValue] = useState(0);
  const [isSavingGroupAlloc, setIsSavingGroupAlloc] = useState(false);

  const handleEditGroupAllocation = (group: GroupData['group'], currentAlloc: number | null) => {
    setEditingGroup({ id: group.id, name: group.name, currentAlloc });
    setGroupAllocValue(currentAlloc ?? 0);
  };

  const handleSaveGroupAllocation = async () => {
    if (!editingGroup) return;
    setIsSavingGroupAlloc(true);
    try {
      const res = await fetch('/api/app/allocations', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          budgetId,
          groupId: editingGroup.id,
          year,
          month,
          allocated: groupAllocValue,
        }),
      });
      if (!res.ok) throw new Error('Erro ao salvar');
      toast.success(`Teto de ${editingGroup.name} atualizado!`);
      setEditingGroup(null);
      onGroupAllocationChange?.();
    } catch {
      toast.error('Erro ao salvar teto do grupo');
    } finally {
      setIsSavingGroupAlloc(false);
    }
  };

  const handleToggleCategory = (categoryId: string) => {
    setExpandedCategoryId((prev) => (prev === categoryId ? null : categoryId));
  };

  if (groupsData.length === 0) {
    return null;
  }

  return (
    <>
      {/* Expenses Section Header - Clickable Toggle */}
      <div
        className="grid grid-cols-[16px_1fr_80px_24px] sm:grid-cols-[24px_1fr_105px_105px_105px_110px] px-3 sm:px-4 py-2 bg-red-100 dark:bg-red-950/50 border-b items-center cursor-pointer hover:bg-red-200/50 dark:hover:bg-red-950/70 transition-colors"
        onClick={onToggle}
      >
        <ChevronDown
          className={cn(
            'h-4 w-4 text-red-700 dark:text-red-300 transition-transform duration-200',
            !isExpanded && '-rotate-90'
          )}
        />
        <div className="flex items-center gap-2">
          <span className="text-lg">💸</span>
          <span className="font-bold text-sm text-red-800 dark:text-red-200">
            {sectionTitle ?? 'DESPESAS'}
          </span>
        </div>
        <div className="hidden sm:block text-sm font-bold tabular-nums text-red-800 dark:text-red-200 text-right pr-2">
          {formatCurrency(totals.allocated)}
        </div>
        <div className={cn(
          "hidden sm:block text-sm font-bold tabular-nums text-right pr-2",
          totals.pending > 0 ? "text-amber-600" : "text-red-800 dark:text-red-200"
        )}>
          {formatCurrency(totals.pending)}
        </div>
        <div className="hidden sm:block text-sm font-bold tabular-nums text-red-600 dark:text-red-400 text-right pr-2">
          {formatCurrency(totals.confirmed)}
        </div>
        <div
          className={cn(
            'hidden sm:block text-sm font-bold tabular-nums text-right pr-2',
            totals.saldo >= 0 ? 'text-green-600' : 'text-red-600'
          )}
        >
          {formatCurrency(totals.saldo)}
        </div>
        {/* Mobile: show based on view mode */}
        {(() => {
          const display = getExpenseDisplayValue(totals.allocated, totals.pending, totals.confirmed, totals.saldo, mobileViewMode);
          return (
            <div className={cn('sm:hidden text-xs font-bold tabular-nums pr-2 whitespace-nowrap', display.colorClass)}>
              {formatCurrency(display.value)}
            </div>
          );
        })()}
        {/* Empty column for alignment with rows that have menu */}
        <div className="sm:hidden" />
      </div>

      <AccordionContent isOpen={isExpanded}>
        {/* Expenses Table Header */}
        <div className="grid grid-cols-[16px_1fr_80px_24px] sm:grid-cols-[24px_1fr_105px_105px_105px_110px] px-3 sm:px-4 py-1.5 text-[11px] font-medium text-muted-foreground uppercase border-b bg-muted/50">
          <div />
          <div>Categoria</div>
          <div className="hidden sm:block text-right pr-2">Planejado</div>
          <div className="hidden sm:block text-right pr-2">Pendente</div>
          <div className="hidden sm:block text-right pr-2">Realizado</div>
          <div className="hidden sm:block text-right pr-2">Saldo</div>
          {/* Mobile: show based on view mode */}
          <div className="sm:hidden">
            {mobileViewMode === 'planned'
              ? 'Plan.'
              : mobileViewMode === 'pending'
                ? 'Pend.'
                : mobileViewMode === 'actual'
                  ? 'Real.'
                  : 'Saldo'}
          </div>
          <div className="sm:hidden" />
        </div>

        {groupsData.map((groupData) => {
          const { group, categories, totals: groupTotals, groupAllocated } = groupData;
          const isGroupExpanded = expandedGroups.includes(group.id);
          // Check if categories sum exceeds the group ceiling
          const categoriesSum = categories.reduce((sum, c) => sum + c.allocated + (c.carriedOver || 0), 0);
          const hasCeiling = groupAllocated != null && groupAllocated > 0;
          const isOverCeiling = hasCeiling && categoriesSum > groupAllocated;

          return (
            <div key={group.id}>
              {/* Group Row */}
              <div
                className="group grid grid-cols-[16px_1fr_80px_24px] sm:grid-cols-[24px_1fr_105px_105px_105px_110px] px-3 sm:px-4 py-1.5 items-center bg-muted/40 border-b cursor-pointer hover:bg-muted/60 text-sm"
                onClick={() => {
                  // Clicking the row always ensures the group is expanded
                  if (!isGroupExpanded) onToggleGroup(group.id);
                }}
              >
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleGroup(group.id);
                  }}
                  className="p-1 -m-1 rounded hover:bg-muted"
                >
                  <ChevronDown
                    className={cn(
                      'h-3.5 w-3.5 shrink-0 transition-transform duration-200',
                      !isGroupExpanded && '-rotate-90'
                    )}
                  />
                </button>
                <div className="flex items-center gap-1 sm:gap-1.5 min-w-0">
                  <span className="shrink-0">{group.icon}</span>
                  <span className="font-bold truncate">{group.name}</span>
                  {isOverCeiling && (
                    <span className="text-[10px] text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/40 px-1.5 py-0.5 rounded-full shrink-0" title={`Categorias somam ${formatCurrency(categoriesSum)}, teto é ${formatCurrency(groupAllocated!)}`}>
                      Excede teto
                    </span>
                  )}
                  {/* Desktop: hover to show action buttons */}
                  <div className="hidden sm:flex items-center gap-0.5 ml-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <button
                      className="p-0.5 rounded hover:bg-muted/80"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditGroupAllocation(group, groupAllocated ?? null);
                      }}
                      title="Definir teto do grupo"
                    >
                      <Pencil className="h-3 w-3" />
                    </button>
                    <button
                      className="p-0.5 rounded hover:bg-muted/80"
                      onClick={(e) => {
                        e.stopPropagation();
                        onAddCategory(group.id, group.code);
                      }}
                      title="Adicionar categoria"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
                <div
                  className="hidden sm:block text-xs tabular-nums font-bold cursor-pointer hover:underline text-right pr-2"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEditGroupAllocation(group, groupAllocated ?? null);
                  }}
                  title="Editar teto do grupo"
                >
                  {groupAllocated != null && groupAllocated > 0
                    ? formatCurrency(groupAllocated)
                    : formatCurrency(groupTotals.allocated)}
                </div>
                <div className={cn(
                  "hidden sm:block text-xs tabular-nums font-bold text-right pr-2",
                  groupTotals.pending > 0 && "text-amber-600"
                )}>
                  {formatCurrency(groupTotals.pending)}
                </div>
                <div className="hidden sm:block text-xs tabular-nums font-bold text-right pr-2">
                  {formatCurrency(groupTotals.confirmed)}
                </div>
                <div
                  className={cn(
                    'hidden sm:block text-xs tabular-nums font-bold text-right pr-2',
                    groupTotals.saldo >= 0 ? 'text-green-600' : 'text-red-600'
                  )}
                >
                  {formatCurrency(groupTotals.saldo)}
                </div>
                {/* Mobile: show based on view mode */}
                {(() => {
                  const display = getExpenseDisplayValue(groupTotals.allocated, groupTotals.pending, groupTotals.confirmed, groupTotals.saldo, mobileViewMode);
                  return (
                    <div className={cn('sm:hidden text-xs tabular-nums font-bold pr-2', display.colorClass)}>
                      {formatCurrency(display.value)}
                    </div>
                  );
                })()}
                {/* Mobile: menu at far right */}
                <div className="sm:hidden flex items-center justify-center">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        className="p-1 rounded hover:bg-muted/80"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreVertical className="h-4 w-4 text-muted-foreground" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onSelect={() => setTimeout(() => handleEditGroupAllocation(group, groupAllocated ?? null), 0)}
                      >
                        <DollarSign className="h-4 w-4 mr-2" />
                        Definir teto do grupo
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onSelect={() => setTimeout(() => onAddCategory(group.id, group.code), 0)}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Adicionar categoria
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              {/* Categories */}
              <AccordionContent isOpen={isGroupExpanded}>
                {categories.map((item) => {
                  const isOtherMember = item.isOtherMemberCategory;

                  // For other member categories, show simple read-only row
                  if (isOtherMember) {
                    return (
                      <div
                        key={item.category.id}
                        className="grid grid-cols-[16px_1fr_80px_24px] sm:grid-cols-[24px_1fr_105px_105px_105px_110px] px-3 sm:px-4 py-1.5 items-center border-b text-sm opacity-75 cursor-default"
                        data-tutorial="category-row"
                      >
                        <div className="h-3.5 w-3.5" />
                        <div className="flex items-center gap-1 sm:gap-1.5 pl-1 sm:pl-3 min-w-0">
                          <span className="shrink-0">{item.category.icon || '📌'}</span>
                          <span className="truncate">{item.category.name}</span>
                        </div>
                        <div className="hidden sm:block text-xs tabular-nums text-right pr-2">
                          {formatCurrency(item.allocated)}
                        </div>
                        <div className={cn(
                          "hidden sm:block text-xs tabular-nums text-right pr-2",
                          item.pending > 0 && "text-amber-600"
                        )}>
                          {formatCurrency(item.pending)}
                        </div>
                        <div className="hidden sm:block text-xs tabular-nums text-right pr-2">
                          {formatCurrency(item.confirmed)}
                        </div>
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
                          const display = getExpenseDisplayValue(item.allocated, item.pending, item.confirmed, item.saldo, mobileViewMode);
                          return (
                            <div className={cn('sm:hidden text-xs tabular-nums font-medium pr-2', display.colorClass)}>
                              {formatCurrency(display.value)}
                            </div>
                          );
                        })()}
                        {/* Empty column for alignment */}
                        <div className="sm:hidden" />
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
                      year={year}
                      month={month}
                      onEditAllocation={onEditAllocation}
                      onEditCategory={onEditCategory}
                      onDeleteCategory={onDeleteCategory}
                      onBillsChange={onBillsChange}
                      mobileViewMode={mobileViewMode}
                      isExpanded={expandedCategoryId === item.category.id}
                      onToggleExpand={() => handleToggleCategory(item.category.id)}
                    />
                  );
                })}
              </AccordionContent>
            </div>
          );
        })}
      </AccordionContent>

      {/* Group allocation (ceiling) edit modal */}
      <FormModalWrapper
        open={!!editingGroup}
        onOpenChange={(open) => !open && setEditingGroup(null)}
        title={`Teto de ${editingGroup?.name ?? ''}`}
        description="Defina o limite mensal para este grupo de despesas"
        isSubmitting={isSavingGroupAlloc}
        onSubmit={handleSaveGroupAllocation}
        submitLabel="Salvar"
      >
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label>Valor do teto</Label>
            <CurrencyInput
              value={groupAllocValue}
              onChange={setGroupAllocValue}
              autoFocus
            />
          </div>
          {editingGroup?.currentAlloc != null && editingGroup.currentAlloc > 0 && (
            <p className="text-xs text-muted-foreground">
              Teto atual: {formatCurrency(editingGroup.currentAlloc)}
            </p>
          )}
        </div>
      </FormModalWrapper>
    </>
  );
}
