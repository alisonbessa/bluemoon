'use client';

import { ChevronDown, Plus, MoreVertical } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu';
import { cn } from '@/shared/lib/utils';
import { AccordionContent } from '@/shared/ui/accordion-content';
import { CategoryWithBills } from './category-with-bills';
import { formatCurrency } from '../types';
import type { MobileViewMode } from '../hooks';

// Local types that match what the budget page provides
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
  onEditAllocation: (category: CategoryLocal, allocated: number) => void;
  onEditCategory: (category: CategoryLocal) => void;
  onDeleteCategory: (category: CategoryLocal) => void;
  onAddCategory: (groupId: string, groupCode: string) => void;
  onBillsChange: () => void;
  mobileViewMode?: MobileViewMode;
}

// Helper to get the value based on view mode for expenses
function getExpenseDisplayValue(
  allocated: number,
  spent: number,
  mode: MobileViewMode
): { value: number; colorClass: string } {
  switch (mode) {
    case 'planned':
      return { value: allocated, colorClass: 'text-red-800 dark:text-red-200' };
    case 'actual':
      return { value: spent, colorClass: 'text-red-600 dark:text-red-400' };
    case 'available':
    default:
      const available = allocated - spent;
      return {
        value: available,
        colorClass: available >= 0 ? 'text-green-600' : 'text-red-600',
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
  mobileViewMode = 'available',
}: ExpensesSectionAccordionProps) {
  if (groupsData.length === 0) {
    return null;
  }

  return (
    <>
      {/* Expenses Section Header - Clickable Toggle */}
      <div
        className="grid grid-cols-[16px_1fr_80px_24px] sm:grid-cols-[24px_1fr_100px_100px_100px] px-3 sm:px-4 py-2 bg-red-100 dark:bg-red-950/50 border-b items-center cursor-pointer hover:bg-red-200/50 dark:hover:bg-red-950/70 transition-colors"
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
            DESPESAS
          </span>
        </div>
        <div className="hidden sm:block text-sm font-bold tabular-nums text-red-800 dark:text-red-200">
          {formatCurrency(totals.allocated)}
        </div>
        <div className="hidden sm:block text-sm font-bold tabular-nums text-red-600 dark:text-red-400">
          {formatCurrency(totals.spent)}
        </div>
        {/* Desktop: always show available */}
        <div
          className={cn(
            'hidden sm:block text-sm font-bold tabular-nums',
            totals.allocated - totals.spent >= 0 ? '' : 'text-red-600'
          )}
        >
          {formatCurrency(totals.allocated - totals.spent)}
        </div>
        {/* Mobile: show based on view mode */}
        {(() => {
          const display = getExpenseDisplayValue(totals.allocated, totals.spent, mobileViewMode);
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
        <div className="grid grid-cols-[16px_1fr_80px_24px] sm:grid-cols-[24px_1fr_100px_100px_100px] px-3 sm:px-4 py-1.5 text-[11px] font-medium text-muted-foreground uppercase border-b bg-muted/50">
          <div />
          <div>Categoria</div>
          <div className="hidden sm:block">Planejado</div>
          <div className="hidden sm:block">Realizado</div>
          {/* Desktop: always show Disp. */}
          <div className="hidden sm:block">Disp.</div>
          {/* Mobile: show based on view mode */}
          <div className="sm:hidden">
            {mobileViewMode === 'planned' ? 'Plan.' : mobileViewMode === 'actual' ? 'Real.' : 'Disp.'}
          </div>
          <div className="sm:hidden" />
        </div>

        {groupsData.map(({ group, categories, totals: groupTotals }) => {
          const isGroupExpanded = expandedGroups.includes(group.id);

          return (
            <div key={group.id}>
              {/* Group Row */}
              <div
                className="group grid grid-cols-[16px_1fr_80px_24px] sm:grid-cols-[24px_1fr_100px_100px_100px] px-3 sm:px-4 py-1.5 items-center bg-muted/40 border-b cursor-pointer hover:bg-muted/60 text-sm"
                onClick={() => onToggleGroup(group.id)}
              >
                <ChevronDown
                  className={cn(
                    'h-3.5 w-3.5 shrink-0 transition-transform duration-200',
                    !isGroupExpanded && '-rotate-90'
                  )}
                />
                <div className="flex items-center gap-1 sm:gap-1.5 min-w-0">
                  <span className="shrink-0">{group.icon}</span>
                  <span className="font-bold truncate">{group.name}</span>
                  {/* Desktop: hover to show add button */}
                  <button
                    className="hidden sm:block ml-1 p-0.5 rounded hover:bg-muted/80 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      onAddCategory(group.id, group.code);
                    }}
                    title="Adicionar categoria"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="hidden sm:block text-xs tabular-nums font-bold">
                  {formatCurrency(groupTotals.allocated)}
                </div>
                <div className="hidden sm:block text-xs tabular-nums font-bold">
                  {formatCurrency(groupTotals.spent)}
                </div>
                {/* Desktop: always show available */}
                <div
                  className={cn(
                    'hidden sm:block text-xs tabular-nums font-bold',
                    groupTotals.available >= 0 ? 'text-green-600' : 'text-red-600'
                  )}
                >
                  {formatCurrency(groupTotals.available)}
                </div>
                {/* Mobile: show based on view mode */}
                {(() => {
                  const display = getExpenseDisplayValue(groupTotals.allocated, groupTotals.spent, mobileViewMode);
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
                        onClick={() => onAddCategory(group.id, group.code)}
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
                        className="grid grid-cols-[16px_1fr_80px_24px] sm:grid-cols-[24px_1fr_100px_100px_100px] px-3 sm:px-4 py-1.5 items-center border-b text-sm opacity-75 cursor-default"
                        data-tutorial="category-row"
                      >
                        <div className="h-3.5 w-3.5" />
                        <div className="flex items-center gap-1 sm:gap-1.5 pl-1 sm:pl-3 min-w-0">
                          <span className="shrink-0">{item.category.icon || '📌'}</span>
                          <span className="truncate">{item.category.name}</span>
                        </div>
                        <div className="hidden sm:block text-xs tabular-nums">
                          {formatCurrency(item.allocated)}
                        </div>
                        <div className="hidden sm:block text-xs tabular-nums">
                          {formatCurrency(item.spent)}
                        </div>
                        {/* Desktop: always show available */}
                        <div
                          className={cn(
                            'hidden sm:block text-xs tabular-nums font-medium',
                            item.available > 0
                              ? 'text-green-600'
                              : item.available < 0
                                ? 'text-red-600'
                                : ''
                          )}
                        >
                          {formatCurrency(item.available)}
                        </div>
                        {/* Mobile: show based on view mode */}
                        {(() => {
                          const display = getExpenseDisplayValue(item.allocated, item.spent, mobileViewMode);
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
                      onEditAllocation={onEditAllocation}
                      onEditCategory={onEditCategory}
                      onDeleteCategory={onDeleteCategory}
                      onBillsChange={onBillsChange}
                      mobileViewMode={mobileViewMode}
                    />
                  );
                })}
              </AccordionContent>
            </div>
          );
        })}
      </AccordionContent>
    </>
  );
}
