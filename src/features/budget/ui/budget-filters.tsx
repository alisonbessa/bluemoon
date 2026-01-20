'use client';

import { Copy, Plus, Undo2, Redo2, Loader2 } from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import type { FilterType } from '@/features/budget/types';

interface FilterOption {
  key: FilterType;
  label: string;
}

const FILTER_OPTIONS: FilterOption[] = [
  { key: 'all', label: 'Todos' },
  { key: 'underfunded', label: 'Faltando' },
  { key: 'overfunded', label: 'Excedido' },
  { key: 'money_available', label: 'Disponível' },
];

interface BudgetFiltersProps {
  // Filter state
  activeFilter: FilterType;
  onFilterChange: (filter: FilterType) => void;

  // Copy from previous month
  hasPreviousMonthData: boolean;
  previousMonthName: string;
  hasExistingAllocations: boolean;
  onCopyClick: () => void;
  isCopying?: boolean;

  // Action buttons (future use)
  onAddGroup?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
}

/**
 * BudgetFilters - Filter bar with category filters and action buttons
 *
 * Features:
 * - Filter chips for filtering categories (all, underfunded, overfunded, money_available)
 * - Copy from previous month button
 * - Add group button (placeholder)
 * - Undo/Redo buttons (placeholder)
 */
export function BudgetFilters({
  activeFilter,
  onFilterChange,
  hasPreviousMonthData,
  previousMonthName,
  hasExistingAllocations,
  onCopyClick,
  isCopying = false,
  onAddGroup,
  canUndo = false,
  canRedo = false,
  onUndo,
  onRedo,
}: BudgetFiltersProps) {
  return (
    <div className="flex items-center justify-between px-4 py-1 border-b bg-muted/30 text-xs">
      {/* Filter Chips */}
      <div className="flex items-center gap-1">
        {FILTER_OPTIONS.map((filter) => (
          <button
            key={filter.key}
            className={cn(
              'px-2 py-1 rounded',
              activeFilter === filter.key
                ? 'bg-background shadow-sm'
                : 'hover:bg-muted'
            )}
            onClick={() => onFilterChange(filter.key)}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-1">
        {/* Copy from previous month */}
        {hasPreviousMonthData && (
          <button
            className="px-2 py-1 rounded hover:bg-muted flex items-center gap-1 disabled:opacity-50"
            onClick={onCopyClick}
            disabled={isCopying}
            title={`Copiar orçamento de ${previousMonthName}`}
          >
            {isCopying ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Copy className="h-3 w-3" />
            )}
            <span className="hidden sm:inline">Copiar de {previousMonthName}</span>
          </button>
        )}

        {/* Add Group */}
        <button
          className="px-2 py-1 rounded hover:bg-muted flex items-center gap-1"
          onClick={onAddGroup}
        >
          <Plus className="h-3 w-3" /> Grupo
        </button>

        {/* Undo/Redo */}
        <button
          className="p-1 rounded hover:bg-muted"
          disabled={!canUndo}
          onClick={onUndo}
        >
          <Undo2 className={cn('h-3 w-3', !canUndo && 'opacity-30')} />
        </button>
        <button
          className="p-1 rounded hover:bg-muted"
          disabled={!canRedo}
          onClick={onRedo}
        >
          <Redo2 className={cn('h-3 w-3', !canRedo && 'opacity-30')} />
        </button>
      </div>
    </div>
  );
}
