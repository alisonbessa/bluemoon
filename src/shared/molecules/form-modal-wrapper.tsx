"use client";

import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
import { Button } from "@/shared/ui/button";

interface FormModalWrapperProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  isSubmitting?: boolean;
  onSubmit: () => void;
  submitLabel?: string;
  cancelLabel?: string;
  /** Variant for the submit button */
  submitVariant?: "default" | "destructive";
}

/**
 * FormModalWrapper - Molecule para envolver formulários em modais
 *
 * Fornece uma estrutura consistente para modais de formulário:
 * - Header com título e descrição opcional
 * - Área de conteúdo para os campos do formulário
 * - Footer com botões de cancelar e submeter
 * - Gestão automática de estado de loading
 *
 * @example
 * ```tsx
 * <FormModalWrapper
 *   open={isOpen}
 *   onOpenChange={setIsOpen}
 *   title="Nova Transação"
 *   description="Preencha os dados da transação"
 *   isSubmitting={isLoading}
 *   onSubmit={handleSubmit}
 * >
 *   <FormFields />
 * </FormModalWrapper>
 * ```
 */
export function FormModalWrapper({
  open,
  onOpenChange,
  title,
  description,
  children,
  isSubmitting = false,
  onSubmit,
  submitLabel = "Salvar",
  cancelLabel = "Cancelar",
  submitVariant = "default",
}: FormModalWrapperProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>

        <div className="py-4">{children}</div>

        <DialogFooter className="flex flex-row justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            {cancelLabel}
          </Button>
          <Button
            variant={submitVariant}
            onClick={onSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {submitLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
