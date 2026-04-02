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
import { Loader2 } from 'lucide-react';
import { INCOME_TYPE_CONFIG } from '@/features/budget/types';

interface IncomeSource {
  id: string;
  name: string;
  type: 'salary' | 'benefit' | 'freelance' | 'rental' | 'investment' | 'other';
}

interface IncomeSourceDeleteDialogProps {
  source: IncomeSource | null;
  onClose: () => void;
  /** Ignore this month only (zero out the planned amount) */
  onIgnoreThisMonth: () => void;
  /** Deactivate from this month onwards (soft delete + remove pending) */
  onDeactivate: () => void;
  /** Delete permanently (remove source + all pending transactions) */
  onDeletePermanently: () => Promise<void>;
  isDeleting?: boolean;
}

/**
 * IncomeSourceDeleteDialog - Scope selection for removing an income source.
 * Same pattern as IncomeEditScopeDialog but for deletion.
 */
export function IncomeSourceDeleteDialog({
  source,
  onClose,
  onIgnoreThisMonth,
  onDeactivate,
  onDeletePermanently,
  isDeleting = false,
}: IncomeSourceDeleteDialogProps) {
  const icon = source ? INCOME_TYPE_CONFIG[source.type]?.icon || '💵' : '';

  return (
    <AlertDialog open={!!source} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            Remover {icon} &quot;{source?.name}&quot;
          </AlertDialogTitle>
          <AlertDialogDescription>
            O que deseja fazer com esta fonte de renda?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="flex flex-col gap-2 py-2">
          <Button
            variant="outline"
            className="justify-start h-auto py-3 px-4"
            onClick={onIgnoreThisMonth}
            disabled={isDeleting}
          >
            <div className="text-left">
              <div className="font-medium">Ignorar apenas este mês</div>
              <div className="text-xs text-muted-foreground">
                Zera o planejado deste mês. A fonte continua ativa nos próximos meses.
              </div>
            </div>
          </Button>
          <Button
            variant="outline"
            className="justify-start h-auto py-3 px-4"
            onClick={onDeactivate}
            disabled={isDeleting}
          >
            <div className="text-left">
              <div className="font-medium">Desativar a partir deste mês</div>
              <div className="text-xs text-muted-foreground">
                Para de gerar nos próximos meses. Transações já confirmadas são mantidas.
              </div>
            </div>
          </Button>
          <Button
            variant="outline"
            className="justify-start h-auto py-3 px-4 text-destructive hover:text-destructive"
            onClick={onDeletePermanently}
            disabled={isDeleting}
          >
            {isDeleting ? (
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Excluindo...
              </div>
            ) : (
              <div className="text-left">
                <div className="font-medium">Excluir permanentemente</div>
                <div className="text-xs text-muted-foreground opacity-80">
                  Remove a fonte e todas as transações pendentes. Transações confirmadas perdem a referência.
                </div>
              </div>
            )}
          </Button>
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
