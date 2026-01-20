'use client';

import { DeleteConfirmDialog } from '@/shared/molecules';
import { INCOME_TYPE_CONFIG } from '@/features/budget/types';

interface IncomeSource {
  id: string;
  name: string;
  type: 'salary' | 'benefit' | 'freelance' | 'rental' | 'investment' | 'other';
}

interface IncomeSourceDeleteDialogProps {
  source: IncomeSource | null;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  isDeleting?: boolean;
}

/**
 * IncomeSourceDeleteDialog - Confirmation dialog for deleting an income source
 */
export function IncomeSourceDeleteDialog({
  source,
  onClose,
  onConfirm,
  isDeleting = false,
}: IncomeSourceDeleteDialogProps) {
  const icon = source ? INCOME_TYPE_CONFIG[source.type]?.icon || '💵' : '';

  return (
    <DeleteConfirmDialog
      open={!!source}
      onOpenChange={(open) => !open && onClose()}
      onConfirm={onConfirm}
      title="Excluir fonte de renda?"
      description={
        <>
          Você está prestes a excluir{' '}
          <strong>
            {icon} {source?.name}
          </strong>
          . Esta ação não pode ser desfeita e os registros de receita associados
          serão mantidos, mas perderão a referência à fonte.
        </>
      }
      confirmLabel={isDeleting ? 'Excluindo...' : 'Excluir'}
      variant="destructive"
    />
  );
}
