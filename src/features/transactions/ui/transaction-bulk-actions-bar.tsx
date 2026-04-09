"use client";

import { Button } from "@/shared/ui/button";
import { Check, Undo2, Trash2, X, Loader2 } from "lucide-react";

interface TransactionBulkActionsBarProps {
  count: number;
  activeSection: "pending" | "confirmed" | null;
  onConfirm: () => void;
  onRevertToPending: () => void;
  onDelete: () => void;
  onClear: () => void;
  isPending?: boolean;
}

export function TransactionBulkActionsBar({
  count,
  activeSection,
  onConfirm,
  onRevertToPending,
  onDelete,
  onClear,
  isPending,
}: TransactionBulkActionsBarProps) {
  if (count === 0 || !activeSection) return null;

  const isPendingSection = activeSection === "pending";

  return (
    <div className="sticky top-0 z-20 flex flex-wrap items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 shadow-sm">
      <span className="text-sm font-medium mr-1">
        {count} {isPendingSection ? "pendente" : "efetivada"}{count === 1 ? "" : "s"} selecionada{count === 1 ? "" : "s"}
      </span>
      <div className="h-4 w-px bg-border mx-1" />
      {isPendingSection ? (
        <Button
          size="sm"
          variant="default"
          className="gap-1.5"
          onClick={onConfirm}
          disabled={isPending}
        >
          {isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Check className="h-3.5 w-3.5" />
          )}
          Confirmar
        </Button>
      ) : (
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5"
          onClick={onRevertToPending}
          disabled={isPending}
        >
          {isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Undo2 className="h-3.5 w-3.5" />
          )}
          Voltar para pendente
        </Button>
      )}
      <Button
        size="sm"
        variant="outline"
        className="gap-1.5 text-destructive hover:text-destructive"
        onClick={onDelete}
        disabled={isPending}
      >
        <Trash2 className="h-3.5 w-3.5" />
        Excluir
      </Button>
      <div className="ml-auto">
        <Button
          size="sm"
          variant="ghost"
          className="gap-1.5"
          onClick={onClear}
          disabled={isPending}
        >
          <X className="h-3.5 w-3.5" />
          Limpar
        </Button>
      </div>
    </div>
  );
}
