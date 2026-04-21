'use client';

import { ChevronDown, Target, Plus, Check, Loader2 } from 'lucide-react';
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
  memberId?: string | null;
  fromAccountId?: string | null;
  mySettings?: { fromAccountId?: string | null; monthlyAmount?: number | null } | null;
  confirmedThisMonth?: boolean;
  isOtherMemberGoal?: boolean;
}

interface GoalsSectionAccordionProps {
  goals: GoalLocal[];
  totalGoals?: number;
  isExpanded: boolean;
  onToggle: () => void;
  onAddGoal: () => void;
  onConfirmGoal?: (goal: GoalLocal) => Promise<void>;
  confirmingGoalId?: string | null;
}

export function GoalsSectionAccordion({
  goals,
  totalGoals = 0,
  isExpanded,
  onToggle,
  onAddGoal,
  onConfirmGoal,
  confirmingGoalId,
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
        <div className="text-xs sm:text-sm font-bold tabular-nums whitespace-nowrap text-violet-800 dark:text-violet-200">
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
            <div className="grid grid-cols-[16px_1fr_80px_32px] sm:grid-cols-[24px_1fr_100px_100px_120px] px-3 sm:px-4 py-1.5 text-[11px] font-medium text-muted-foreground uppercase border-b bg-muted/50">
              <div />
              <div>Meta</div>
              <div className="hidden sm:block">Progresso</div>
              <div>Mensal</div>
              <div className="hidden sm:block" />
            </div>

            {/* Goals Rows */}
            {goals.map((goal) => {
              const isConfirming = confirmingGoalId === goal.id;
              // Use mySettings (per-member) if available, otherwise fall back to goal's fromAccountId
              const effectiveFromAccountId = goal.mySettings?.fromAccountId ?? goal.fromAccountId;
              const effectiveMonthlyAmount = goal.mySettings?.monthlyAmount ?? null;
              const canConfirm = !!effectiveFromAccountId && !goal.confirmedThisMonth && !!onConfirmGoal;

              return (
                <div
                  key={goal.id}
                  className={cn(
                    'grid grid-cols-[16px_1fr_80px_32px] sm:grid-cols-[24px_1fr_100px_100px_120px] px-3 sm:px-4 py-1.5 items-center border-b text-sm',
                    goal.confirmedThisMonth && 'opacity-60'
                  )}
                >
                  <div />
                  <Link href="/app/goals" className="flex items-center gap-2 min-w-0 hover:underline">
                    <span className="text-sm sm:text-base shrink-0">{goal.icon}</span>
                    <span className={cn('font-medium truncate', goal.confirmedThisMonth && 'line-through')}>{goal.name}</span>
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
                  </Link>
                  {/* Desktop: progress percentage */}
                  <div className="hidden sm:block text-xs tabular-nums whitespace-nowrap text-violet-600 dark:text-violet-400">
                    {goal.progress}%
                  </div>
                  <div className="text-xs tabular-nums whitespace-nowrap font-medium">
                    {formatCurrency(goal.monthlyTarget)}
                  </div>
                  {/* Action column: confirm button or status */}
                  <div className="flex items-center justify-end gap-1">
                    {goal.confirmedThisMonth ? (
                      <div className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                        <Check className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">Confirmado</span>
                      </div>
                    ) : canConfirm ? (
                      <button
                        onClick={() => onConfirmGoal({ ...goal, fromAccountId: effectiveFromAccountId, monthlyTarget: effectiveMonthlyAmount ?? goal.monthlyTarget })}
                        disabled={isConfirming}
                        title="Confirmar contribuicao deste mes"
                        className="flex items-center gap-1 rounded px-1.5 py-0.5 text-xs bg-violet-100 hover:bg-violet-200 text-violet-700 dark:bg-violet-950/50 dark:hover:bg-violet-900/50 dark:text-violet-300 transition-colors disabled:opacity-50"
                      >
                        {isConfirming
                          ? <Loader2 className="h-3 w-3 animate-spin" />
                          : <Check className="h-3 w-3" />
                        }
                        <span className="hidden sm:inline">Confirmar</span>
                      </button>
                    ) : (
                      <div className="hidden sm:block text-xs tabular-nums whitespace-nowrap text-muted-foreground">
                        {goal.monthsRemaining > 0
                          ? `${goal.monthsRemaining} ${goal.monthsRemaining === 1 ? 'mes' : 'meses'}`
                          : 'Vencida'}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
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
