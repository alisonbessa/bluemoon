'use client';

import {
  Calendar,
  Pencil,
  Archive,
  TrendingUp,
  Plus,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { formatCurrency } from '@/lib/formatters';
import type { Goal } from '@/types';

interface GoalCardProps {
  goal: Goal;
  onEdit: (goal: Goal) => void;
  onArchive: (goal: Goal) => void;
  onContribute: (goal: Goal) => void;
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });
}

export function GoalCard({ goal, onEdit, onArchive, onContribute }: GoalCardProps) {
  return (
    <div
      className="rounded-lg border bg-card p-4 hover:shadow-md transition-shadow"
      style={{ borderLeftColor: goal.color, borderLeftWidth: '4px' }}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{goal.icon}</span>
          <div>
            <h3 className="font-semibold">{goal.name}</h3>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Calendar className="h-3 w-3" />
              <span>até {formatDate(goal.targetDate)}</span>
            </div>
          </div>
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => onEdit(goal)}
            className="p-1 rounded hover:bg-muted transition-colors"
            title="Editar meta"
          >
            <Pencil className="h-4 w-4 text-muted-foreground" />
          </button>
          <button
            onClick={() => onArchive(goal)}
            className="p-1 rounded hover:bg-muted transition-colors"
            title="Arquivar meta"
          >
            <Archive className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* Progress */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Progresso</span>
          <span className="font-medium">{goal.progress}%</span>
        </div>
        <Progress
          value={goal.progress}
          className="h-2"
          style={
            {
              '--progress-background': goal.color,
            } as React.CSSProperties
          }
        />
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">
            {formatCurrency(goal.currentAmount)} de {formatCurrency(goal.targetAmount)}
          </span>
        </div>
      </div>

      {/* Monthly suggestion */}
      {goal.monthsRemaining > 0 && goal.remaining > 0 && (
        <div className="mt-3 p-2 bg-muted/50 rounded-md">
          <div className="flex items-center gap-2 text-sm">
            <TrendingUp className="h-4 w-4 text-primary" />
            <span>
              Guardar{' '}
              <span className="font-semibold text-primary">
                {formatCurrency(goal.monthlyTarget)}
              </span>
              /mês
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {goal.monthsRemaining}{' '}
            {goal.monthsRemaining === 1 ? 'mês restante' : 'meses restantes'}
          </p>
        </div>
      )}

      {/* Contribute button */}
      <Button
        variant="outline"
        size="sm"
        className="w-full mt-3"
        onClick={() => onContribute(goal)}
      >
        <Plus className="mr-2 h-4 w-4" />
        Contribuir
      </Button>
    </div>
  );
}
