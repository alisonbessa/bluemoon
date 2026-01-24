"use client";

import { DeleteConfirmDialog } from "@/shared/molecules";
import type { Transaction } from '../types';

interface TransactionDeleteDialogProps {
  transaction: Transaction | null;
  onClose: () => void;
  onConfirm: () => void;
}

export function TransactionDeleteDialog({
  transaction,
  onClose,
  onConfirm,
}: TransactionDeleteDialogProps) {
  // Check if this is a transaction from planning (recurring bill or income source)
  const isFromPlanning =
    transaction?.recurringBillId || transaction?.incomeSourceId;

  return (
    <DeleteConfirmDialog
      open={!!transaction}
      onOpenChange={(open) => !open && onClose()}
      onConfirm={onConfirm}
      title={isFromPlanning ? "Desfazer confirmação?" : "Excluir transação?"}
      description={
        isFromPlanning
          ? "A transação voltará para a lista de pendentes."
          : "Tem certeza que deseja excluir esta transação? Esta ação não pode ser desfeita."
      }
      confirmLabel={isFromPlanning ? "Desfazer" : "Excluir"}
      variant={isFromPlanning ? "warning" : "destructive"}
    />
  );
}
