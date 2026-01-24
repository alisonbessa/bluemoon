'use client';

import { DeleteConfirmDialog } from '@/shared/molecules';

interface Category {
  id: string;
  name: string;
  icon?: string | null;
}

interface CategoryDeleteDialogProps {
  category: Category | null;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  isDeleting?: boolean;
}

/**
 * CategoryDeleteDialog - Confirmation dialog for deleting a category
 */
export function CategoryDeleteDialog({
  category,
  onClose,
  onConfirm,
  isDeleting = false,
}: CategoryDeleteDialogProps) {
  return (
    <DeleteConfirmDialog
      open={!!category}
      onOpenChange={(open) => !open && onClose()}
      onConfirm={onConfirm}
      title="Excluir categoria?"
      description={
        <>
          Você está prestes a excluir a categoria{' '}
          <strong>
            {category?.icon} {category?.name}
          </strong>
          . Esta ação não pode ser desfeita e todas as transações associadas
          perderão a referência à categoria.
        </>
      }
      confirmLabel={isDeleting ? 'Excluindo...' : 'Excluir'}
      variant="destructive"
    />
  );
}
