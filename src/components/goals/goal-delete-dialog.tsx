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
import type { Goal } from '@/types';

interface GoalDeleteDialogProps {
  goal: Goal | null;
  onClose: () => void;
  onConfirm: () => void;
}

export function GoalDeleteDialog({
  goal,
  onClose,
  onConfirm,
}: GoalDeleteDialogProps) {
  return (
    <AlertDialog open={!!goal} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Arquivar meta?</AlertDialogTitle>
          <AlertDialogDescription>
            Tem certeza que deseja arquivar a meta &quot;{goal?.name}&quot;? A meta
            será removida da sua lista, mas você pode restaurá-la depois.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onClose}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Arquivar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
