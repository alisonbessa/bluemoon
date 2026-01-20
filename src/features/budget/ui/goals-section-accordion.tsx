'use client';

import { ChevronDown, Target, Plus } from 'lucide-react';
import { Progress } from '@/shared/ui/progress';
import Link from 'next/link';
import { cn } from '@/shared/lib/utils';
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
  isExpanded: boolean;
  onToggle: () => void;
  onAddGoal: () => void;
}

export function GoalsSectionAccordion({
  goals,
  isExpanded,
  onToggle,
  onAddGoal,
}: GoalsSectionAccordionProps) {
  return (
    <div className="border-b" data-tutorial="goals-group">
      {/* Goals Section Header - Clickable Toggle */}
      <div
        className="group px-4 py-2 bg-violet-100 dark:bg-violet-950/50 border-b flex items-center justify-between cursor-pointer hover:bg-violet-200/50 dark:hover:bg-violet-950/70 transition-colors"
        onClick={onToggle}
      >
        <div className="flex items-center gap-2">
          <ChevronDown
            className={cn(
              'h-4 w-4 text-violet-700 dark:text-violet-300 transition-transform',
              !isExpanded && '-rotate-90'
            )}
          />
          <Target className="h-4 w-4 text-violet-700 dark:text-violet-300" />
          <span className="font-bold text-sm text-violet-800 dark:text-violet-200">
            METAS
          </span>
          <button
            className="ml-1 p-0.5 rounded hover:bg-violet-200 dark:hover:bg-violet-800 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => {
              e.stopPropagation();
              onAddGoal();
            }}
            title="Adicionar meta"
          >
            <Plus className="h-3.5 w-3.5 text-violet-700 dark:text-violet-300" />
          </button>
        </div>
        <div className="flex items-center gap-2 text-sm">
          {goals.length > 0 && (
            <>
              <span className="text-xs text-muted-foreground font-normal">
                Mensal sugerido:
              </span>
              <span className="font-bold text-violet-800 dark:text-violet-200">
                {formatCurrency(goals.reduce((sum, g) => sum + g.monthlyTarget, 0))}
              </span>
            </>
          )}
        </div>
      </div>

      {isExpanded && goals.length > 0 && (
        <div className="overflow-x-auto">
          <div className="min-w-[550px]">
            {/* Goals Table Header */}
            <div className="grid grid-cols-[24px_1fr_100px_100px_110px] px-4 py-1.5 text-[11px] font-medium text-muted-foreground uppercase border-b bg-muted/50">
              <div />
              <div>Meta</div>
              <div className="text-right">Progresso</div>
              <div className="text-right">Mensal</div>
              <div className="text-right">Restante</div>
            </div>

            {/* Goals Rows */}
            {goals.map((goal) => (
              <Link
                key={goal.id}
                href="/app/goals"
                className="grid grid-cols-[24px_1fr_100px_100px_110px] px-4 py-2 items-center border-b hover:bg-muted/20 text-sm cursor-pointer"
              >
                <div className="flex items-center justify-center">
                  <span className="text-base">{goal.icon}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{goal.name}</span>
                  <div className="flex-1 max-w-[120px]">
                    <Progress
                      value={goal.progress}
                      className="h-1.5"
                      style={
                        { '--progress-background': goal.color } as React.CSSProperties
                      }
                    />
                  </div>
                </div>
                <div className="text-right text-xs tabular-nums text-violet-600 dark:text-violet-400">
                  {goal.progress}%
                </div>
                <div className="text-right text-xs tabular-nums font-medium">
                  {formatCurrency(goal.monthlyTarget)}
                </div>
                <div className="text-right text-xs tabular-nums text-muted-foreground">
                  {goal.monthsRemaining > 0
                    ? `${goal.monthsRemaining} ${goal.monthsRemaining === 1 ? 'mes' : 'meses'}`
                    : 'Vencida'}
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Empty state for goals */}
      {isExpanded && goals.length === 0 && (
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
    </div>
  );
}
