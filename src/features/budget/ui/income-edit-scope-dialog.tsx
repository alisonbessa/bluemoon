'use client';

import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from '@/shared/ui/alert-dialog';
import { Button } from '@/shared/ui/button';
import type { IncomeSource } from '@/features/income/types';

interface IncomeEditScopeDialogProps {
  source: IncomeSource | null;
  onClose: () => void;
  onEditAll: () => void;
  onEditThisAndFuture: () => void;
  onEditThisMonth: () => void;
}

export function IncomeEditScopeDialog({
  source,
  onClose,
  onEditAll,
  onEditThisAndFuture,
  onEditThisMonth,
}: IncomeEditScopeDialogProps) {
  if (!source) return null;

  return (
    <AlertDialog open={!!source} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Editar &quot;{source.name}&quot;</AlertDialogTitle>
          <AlertDialogDescription>
            Qual período você quer alterar?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="flex flex-col gap-2 py-2">
          <Button variant="outline" className="justify-start h-auto py-3 px-4" onClick={onEditThisMonth}>
            <div className="text-left">
              <div className="font-medium">Apenas este mês</div>
              <div className="text-xs text-muted-foreground">Altera o valor planejado só para o mês atual</div>
            </div>
          </Button>
          <Button variant="outline" className="justify-start h-auto py-3 px-4" onClick={onEditThisAndFuture}>
            <div className="text-left">
              <div className="font-medium">Este e os próximos meses</div>
              <div className="text-xs text-muted-foreground">Encerra esta fonte e cria uma nova a partir deste mês</div>
            </div>
          </Button>
          <Button variant="outline" className="justify-start h-auto py-3 px-4" onClick={onEditAll}>
            <div className="text-left">
              <div className="font-medium">Todos os meses</div>
              <div className="text-xs text-muted-foreground">Altera o valor padrão para todos os meses sem override</div>
            </div>
          </Button>
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
