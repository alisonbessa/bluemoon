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

  // Check if this is a parent installment (deleting will remove all installments)
  const isParentInstallment =
    transaction?.isInstallment && !transaction?.parentTransactionId;

  const getDescription = () => {
    if (isFromPlanning) {
      return "A transação voltará para a lista de pendentes.";
    }
    if (isParentInstallment) {
      return `Todas as ${transaction?.totalInstallments || ""} parcelas desta compra serão excluídas. Esta ação não pode ser desfeita.`;
    }
    return "Tem certeza que deseja excluir esta transação? Esta ação não pode ser desfeita.";
  };

  return (
    <DeleteConfirmDialog
      open={!!transaction}
      onOpenChange={(open) => !open && onClose()}
      onConfirm={onConfirm}
      title={isFromPlanning ? "Desfazer confirmação?" : "Excluir transação?"}
      description={getDescription()}
      confirmLabel={isFromPlanning ? "Desfazer" : "Excluir"}
      variant={isFromPlanning ? "warning" : "destructive"}
    />
  );
}
