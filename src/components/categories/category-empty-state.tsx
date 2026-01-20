'use client';

import { FolderOpen, Settings, Plus } from 'lucide-react';
import { Button } from '@/shared/ui/button';

interface CategoryEmptyStateProps {
  onSetup: () => void;
  onCreateNew: () => void;
}

export function CategoryEmptyState({
  onSetup,
  onCreateNew,
}: CategoryEmptyStateProps) {
  return (
    <div className="rounded-lg border border-dashed bg-card p-8 text-center">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
        <FolderOpen className="h-6 w-6 text-muted-foreground" />
      </div>
      <h3 className="font-semibold">Nenhuma categoria configurada</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        Complete o onboarding para criar categorias automaticamente ou adicione
        manualmente
      </p>
      <div className="flex justify-center gap-2 mt-4">
        <Button variant="outline" onClick={onSetup}>
          <Settings className="mr-2 h-4 w-4" />
          Configurar Categorias
        </Button>
        <Button onClick={onCreateNew}>
          <Plus className="mr-2 h-4 w-4" />
          Nova Categoria
        </Button>
      </div>
    </div>
  );
}
