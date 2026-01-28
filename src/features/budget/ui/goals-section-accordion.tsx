'use client';

import { ChevronDown, Target, Plus } from 'lucide-react';
import { Progress } from '@/shared/ui/progress';
import Link from 'next/link';
import { cn } from '@/shared/lib/utils';
import { AccordionContent } from '@/shared/ui/accordion-content';
import { formatCurrency } from '../types';

// Local type that matches what the budget page provides
interface GoalLocal {
  id: string;
  name: string;
  icon: string;
  color: string;
  targetAmount: number;
  currentAmount: number;
  progress: number;
  monthlyTarget: number;
  monthsRemaining: number;
  isCompleted: boolean;
}

interface GoalsSectionAccordionProps {
  goals: GoalLocal[];
  totalGoals?: number;
  isExpanded: boolean;
  onToggle: () => void;
  onAddGoal: () => void;
}

export function GoalsSectionAccordion({
  goals,
  totalGoals = 0,
  isExpanded,
  onToggle,
  onAddGoal,
}: GoalsSectionAccordionProps) {
  // Calculate total if not provided
  const totalMonthly = totalGoals || goals.reduce((sum, g) => sum + (g.monthlyTarget || 0), 0);

  return (
    <div className="border-b" data-tutorial="goals-group">
      {/* Goals Section Header - Clickable Toggle (same structure as Income/Expenses) */}
      <div
        className="group grid grid-cols-[16px_1fr_80px_24px] sm:grid-cols-[24px_1fr_100px_100px_100px] px-3 sm:px-4 py-2 bg-violet-100 dark:bg-violet-950/50 border-b items-center cursor-pointer hover:bg-violet-200/50 dark:hover:bg-violet-950/70 transition-colors"
        onClick={onToggle}
      >
        <ChevronDown
          className={cn(
            'h-4 w-4 text-violet-700 dark:text-violet-300 transition-transform duration-200',
            !isExpanded && '-rotate-90'
          )}
        />
        <div className="flex items-center gap-2">
          <span className="text-lg">🎯</span>
          <span className="font-bold text-sm text-violet-800 dark:text-violet-200">
            METAS
          </span>
          <button
            className="hidden sm:block ml-1 p-0.5 rounded hover:bg-violet-200 dark:hover:bg-violet-800 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
            onClick={(e) => {
              e.stopPropagation();
              onAddGoal();
            }}
            title="Adicionar meta"
          >
            <Plus className="h-3.5 w-3.5 text-violet-700 dark:text-violet-300" />
          </button>
        </div>
        {/* Desktop: empty columns */}
        <div className="hidden sm:block" />
        <div className="hidden sm:block" />
        {/* Total monthly value */}
        <div className="text-xs sm:text-sm font-bold tabular-nums text-violet-800 dark:text-violet-200 whitespace-nowrap">
          {formatCurrency(totalMonthly)}
        </div>
        {/* Mobile: add button in separate column */}
        <div className="sm:hidden flex items-center justify-center">
          <button
            className="p-1 rounded hover:bg-violet-200 dark:hover:bg-violet-800"
            onClick={(e) => {
              e.stopPropagation();
              onAddGoal();
            }}
          >
            <Plus className="h-4 w-4 text-violet-700 dark:text-violet-300" />
          </button>
        </div>
      </div>

      <AccordionContent isOpen={isExpanded}>
        {goals.length > 0 ? (
          <div>
            {/* Goals Table Header */}
            <div className="grid grid-cols-[16px_1fr_80px_24px] sm:grid-cols-[24px_1fr_100px_100px_100px] px-3 sm:px-4 py-1.5 text-[11px] font-medium text-muted-foreground uppercase border-b bg-muted/50">
              <div />
              <div>Meta</div>
              <div className="hidden sm:block">Progresso</div>
              <div>Mensal</div>
              <div className="hidden sm:block">Restante</div>
              <div className="sm:hidden" />
            </div>

            {/* Goals Rows */}
            {goals.map((goal) => (
              <Link
                key={goal.id}
                href="/app/goals"
                className="grid grid-cols-[16px_1fr_80px_24px] sm:grid-cols-[24px_1fr_100px_100px_100px] px-3 sm:px-4 py-1.5 items-center border-b hover:bg-muted/20 text-sm cursor-pointer"
              >
                <div />
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-sm sm:text-base shrink-0">{goal.icon}</span>
                  <span className="font-medium truncate">{goal.name}</span>
                  {/* Progress bar - desktop only */}
                  <div className="hidden sm:block flex-1 max-w-30">
                    <Progress
                      value={goal.progress}
                      className="h-1.5"
                      style={
                        { '--progress-background': goal.color } as React.CSSProperties
                      }
                    />
                  </div>
                </div>
                {/* Desktop: progress percentage */}
                <div className="hidden sm:block text-xs tabular-nums text-violet-600 dark:text-violet-400">
                  {goal.progress}%
                </div>
                <div className="text-xs tabular-nums font-medium">
                  {formatCurrency(goal.monthlyTarget)}
                </div>
                <div className="hidden sm:block text-xs tabular-nums text-muted-foreground">
                  {goal.monthsRemaining > 0
                    ? `${goal.monthsRemaining} ${goal.monthsRemaining === 1 ? 'mes' : 'meses'}`
                    : 'Vencida'}
                </div>
                {/* Mobile: empty column for alignment */}
                <div className="sm:hidden" />
              </Link>
            ))}
          </div>
        ) : (
          /* Empty state for goals */
          <div className="p-6 text-center text-muted-foreground">
            <Target className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Nenhuma meta criada ainda</p>
            <button
              onClick={onAddGoal}
              className="mt-2 text-sm text-violet-600 dark:text-violet-400 hover:underline"
            >
              Criar sua primeira meta
            </button>
          </div>
        )}
      </AccordionContent>
    </div>
  );
}
