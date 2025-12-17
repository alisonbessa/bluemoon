'use client';

import { FolderOpen } from 'lucide-react';

interface CategorySummaryProps {
  groupCount: number;
  categoryCount: number;
}

export function CategorySummary({
  groupCount,
  categoryCount,
}: CategorySummaryProps) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="rounded-lg border bg-card p-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <FolderOpen className="h-4 w-4" />
          <span>Grupos</span>
        </div>
        <div className="mt-1 text-xl font-bold">{groupCount}</div>
      </div>

      <div className="rounded-lg border bg-card p-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="text-lg">📌</span>
          <span>Categorias</span>
        </div>
        <div className="mt-1 text-xl font-bold">{categoryCount}</div>
      </div>
    </div>
  );
}
