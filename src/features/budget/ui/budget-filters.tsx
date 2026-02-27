'use client';

import { Copy, Loader2, ChevronDown, Users, User } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu';
import { cn } from '@/shared/lib/utils';
import type { MobileViewMode, BudgetViewMode } from '../hooks';

const VIEW_MODE_LABELS: Record<MobileViewMode, string> = {
  planned: 'Planejado',
  actual: 'Realizado',
  available: 'Pendente',
};

interface BudgetFiltersProps {
  // Copy from previous month
  hasPreviousMonthData: boolean;
  previousMonthName: string;
  onCopyClick: () => void;
  isCopying?: boolean;
  // Mobile view mode
  mobileViewMode: MobileViewMode;
  onViewModeChange: (mode: MobileViewMode) => void;
  // Budget view mode (shared vs personal)
  hasContributionModel?: boolean;
  budgetViewMode?: BudgetViewMode;
  onBudgetViewModeChange?: (mode: BudgetViewMode) => void;
}

/**
 * BudgetFilters - Action bar with copy from previous month, budget view toggle, and mobile view mode selector
 */
export function BudgetFilters({
  hasPreviousMonthData,
  previousMonthName,
  onCopyClick,
  isCopying = false,
  mobileViewMode,
  onViewModeChange,
  hasContributionModel = false,
  budgetViewMode = 'shared',
  onBudgetViewModeChange,
}: BudgetFiltersProps) {
  return (
    <div className="flex items-center justify-between px-3 sm:px-4 py-1.5 border-b bg-muted/30 text-xs gap-2">
      {/* Left: Copy from previous month */}
      {hasPreviousMonthData ? (
        <button
          className="px-2 py-1 rounded hover:bg-muted flex items-center gap-1.5 disabled:opacity-50 shrink-0"
          onClick={onCopyClick}
          disabled={isCopying}
          title={`Copiar orçamento de ${previousMonthName}`}
        >
          {isCopying ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Copy className="h-3.5 w-3.5" />
          )}
          <span className="hidden sm:inline">Copiar de {previousMonthName}</span>
          <span className="sm:hidden">Copiar</span>
        </button>
      ) : (
        <div />
      )}

      <div className="flex items-center gap-2">
        {/* Budget view mode toggle (only for contribution model) */}
        {hasContributionModel && onBudgetViewModeChange && (
          <div className="flex items-center bg-muted rounded-md p-0.5">
            <button
              className={cn(
                'flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors',
                budgetViewMode === 'shared'
                  ? 'bg-background shadow-sm font-medium'
                  : 'text-muted-foreground hover:text-foreground'
              )}
              onClick={() => onBudgetViewModeChange('shared')}
            >
              <Users className="h-3 w-3" />
              <span>Compartilhado</span>
            </button>
            <button
              className={cn(
                'flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors',
                budgetViewMode === 'personal'
                  ? 'bg-background shadow-sm font-medium'
                  : 'text-muted-foreground hover:text-foreground'
              )}
              onClick={() => onBudgetViewModeChange('personal')}
            >
              <User className="h-3 w-3" />
              <span>Meu</span>
            </button>
          </div>
        )}

        {/* Right: Mobile view mode selector */}
        <div className="sm:hidden">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="px-2 py-1 rounded hover:bg-muted flex items-center gap-1">
                <span className="text-muted-foreground">Ver:</span>
                <span className="font-medium">{VIEW_MODE_LABELS[mobileViewMode]}</span>
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => onViewModeChange('planned')}
                className={mobileViewMode === 'planned' ? 'bg-muted' : ''}
              >
                Planejado
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onViewModeChange('actual')}
                className={mobileViewMode === 'actual' ? 'bg-muted' : ''}
              >
                Realizado
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onViewModeChange('available')}
                className={mobileViewMode === 'available' ? 'bg-muted' : ''}
              >
                Pendente
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}
