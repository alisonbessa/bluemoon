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
import { cn } from "@/shared/lib/utils";

interface FormModalWrapperProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;

  /**
   * Footer options:
   * - 'default': Standard Cancel/Submit footer (default)
   * - 'none': No footer rendered
   * - ReactNode: Custom footer content
   */
  footer?: 'default' | 'none' | React.ReactNode;

  // Default footer props (only used when footer='default' or undefined)
  isSubmitting?: boolean;
  onSubmit?: () => void;
  submitLabel?: string;
  cancelLabel?: string;
  /** Variant for the submit button */
  submitVariant?: "default" | "destructive";
  /** Disable submit button independently of isSubmitting */
  submitDisabled?: boolean;

  // Layout options
  /** Modal size variant */
  size?: 'sm' | 'default' | 'lg' | 'xl';
  /** Additional classes for content area */
  contentClassName?: string;
}

const sizeClasses = {
  sm: 'sm:max-w-lg',
  default: 'sm:max-w-lg',
  lg: 'sm:max-w-2xl',
  xl: 'sm:max-w-4xl',
};

/**
 * FormModalWrapper - Molecule para envolver formulários em modais
 *
 * Fornece uma estrutura consistente para modais de formulário:
 * - Header com título e descrição opcional
 * - Área de conteúdo para os campos do formulário
 * - Footer flexível: padrão, customizado ou sem footer
 * - Gestão automática de estado de loading
 * - Suporte a diferentes tamanhos de modal
 *
 * @example
 * ```tsx
 * // Modal simples com footer padrão
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
 *
 * // Modal com footer customizado
 * <FormModalWrapper
 *   open={isOpen}
 *   onOpenChange={setIsOpen}
 *   title="Configurações"
 *   footer={<CustomFooter />}
 * >
 *   <SettingsFields />
 * </FormModalWrapper>
 *
 * // Modal sem footer
 * <FormModalWrapper
 *   open={isOpen}
 *   onOpenChange={setIsOpen}
 *   title="Visualização"
 *   footer="none"
 * >
 *   <ViewContent />
 * </FormModalWrapper>
 * ```
 */
export function FormModalWrapper({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer = 'default',
  isSubmitting = false,
  onSubmit,
  submitLabel = "Salvar",
  cancelLabel = "Cancelar",
  submitVariant = "default",
  submitDisabled = false,
  size = 'default',
  contentClassName,
}: FormModalWrapperProps) {
  const renderFooter = () => {
    if (footer === 'none') {
      return null;
    }

    if (footer !== 'default') {
      // Custom footer provided as ReactNode
      return footer;
    }

    // Default footer
    return (
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
          disabled={isSubmitting || submitDisabled}
        >
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {submitLabel}
        </Button>
      </DialogFooter>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn(sizeClasses[size], "max-h-[85vh] flex flex-col")}>
        <DialogHeader className="shrink-0">
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>

        <div className={cn("py-4 overflow-y-auto flex-1 -mx-6 px-6", contentClassName)}>
          {children}
        </div>

        <div className="shrink-0">{renderFooter()}</div>
      </DialogContent>
    </Dialog>
  );
}
