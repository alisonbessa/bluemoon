'use client';

import { Wallet, Plus } from 'lucide-react';
import { Button } from '@/shared/ui/button';

interface IncomeEmptyStateProps {
  onCreateNew: () => void;
}

export function IncomeEmptyState({ onCreateNew }: IncomeEmptyStateProps) {
  return (
    <div className="rounded-lg border border-dashed bg-card p-8 text-center">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
        <Wallet className="h-6 w-6 text-muted-foreground" />
      </div>
      <h3 className="font-semibold">Nenhuma renda configurada</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        Adicione suas fontes de renda para começar a planejar seu orçamento
      </p>
      <Button className="mt-4" onClick={onCreateNew}>
        <Plus className="mr-2 h-4 w-4" />
        Adicionar Renda
      </Button>
    </div>
  );
}
