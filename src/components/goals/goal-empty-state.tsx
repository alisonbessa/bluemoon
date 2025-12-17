'use client';

import { Target, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface GoalEmptyStateProps {
  onCreateNew: () => void;
}

export function GoalEmptyState({ onCreateNew }: GoalEmptyStateProps) {
  return (
    <div className="rounded-lg border border-dashed bg-card p-8 text-center">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
        <Target className="h-6 w-6 text-muted-foreground" />
      </div>
      <h3 className="font-semibold">Nenhuma meta ativa</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        Crie metas financeiras e acompanhe seu progresso
      </p>
      <Button className="mt-4" onClick={onCreateNew}>
        <Plus className="mr-2 h-4 w-4" />
        Criar Primeira Meta
      </Button>
    </div>
  );
}
