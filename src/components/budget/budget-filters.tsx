'use client';

import { Copy, Plus, Undo2, Redo2, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { FilterType } from '@/types/category';
import { MONTHS_SHORT_PT } from '@/lib/date-utils';

interface BudgetFiltersProps {
  activeFilter: FilterType;
  onFilterChange: (filter: FilterType) => void;
  onCopyFromPrevMonth: () => void;
  isCopying: boolean;
  previousMonthName: string;
}

const FILTERS: { key: FilterType; label: string }[] = [
  { key: 'all', label: 'Todos' },
  { key: 'underfunded', label: 'Faltando' },
  { key: 'overfunded', label: 'Excedido' },
  { key: 'money_available', label: 'Disponível' },
];

export function BudgetFilters({
  activeFilter,
  onFilterChange,
  onCopyFromPrevMonth,
  isCopying,
  previousMonthName,
}: BudgetFiltersProps) {
  return (
    <div className="flex items-center justify-between px-4 py-1 border-b bg-muted/30 text-xs">
      <div className="flex items-center gap-1">
        {FILTERS.map((filter) => (
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
      <div className="flex items-center gap-1">
        <button
          className="px-2 py-1 rounded hover:bg-muted flex items-center gap-1 disabled:opacity-50"
          onClick={onCopyFromPrevMonth}
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
        <button className="px-2 py-1 rounded hover:bg-muted flex items-center gap-1">
          <Plus className="h-3 w-3" /> Grupo
        </button>
        <button className="p-1 rounded hover:bg-muted" disabled>
          <Undo2 className="h-3 w-3 opacity-30" />
        </button>
        <button className="p-1 rounded hover:bg-muted" disabled>
          <Redo2 className="h-3 w-3 opacity-30" />
        </button>
      </div>
    </div>
  );
}
