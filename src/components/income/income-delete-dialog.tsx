'use client';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import type { IncomeSource } from '@/types';

interface IncomeDeleteDialogProps {
  source: IncomeSource | null;
  onClose: () => void;
  onConfirm: () => void;
}

export function IncomeDeleteDialog({
  source,
  onClose,
  onConfirm,
}: IncomeDeleteDialogProps) {
  return (
    <AlertDialog open={!!source} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir fonte de renda?</AlertDialogTitle>
          <AlertDialogDescription>
            Tem certeza que deseja excluir &quot;{source?.name}&quot;? Esta ação
            não pode ser desfeita.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onClose}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Excluir
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
