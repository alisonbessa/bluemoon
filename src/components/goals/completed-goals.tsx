'use client';

import { Trophy } from 'lucide-react';
import { formatCurrency } from '@/lib/formatters';
import type { Goal } from '@/types';

interface CompletedGoalsProps {
  goals: Goal[];
}

function formatFullDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

export function CompletedGoals({ goals }: CompletedGoalsProps) {
  if (goals.length === 0) return null;

  return (
    <div className="mt-6">
      <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
        <Trophy className="h-5 w-5 text-yellow-500" />
        Metas Concluídas
      </h2>
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {goals.map((goal) => (
          <div
            key={goal.id}
            className="rounded-lg border bg-card/50 p-3 opacity-75"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xl">{goal.icon}</span>
                <div>
                  <h3 className="font-medium text-sm">{goal.name}</h3>
                  <p className="text-xs text-muted-foreground">
                    {formatCurrency(goal.targetAmount)} • Concluída em{' '}
                    {goal.completedAt
                      ? formatFullDate(goal.completedAt)
                      : formatFullDate(goal.updatedAt)}
                  </p>
                </div>
              </div>
              <Trophy className="h-5 w-5 text-yellow-500" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
