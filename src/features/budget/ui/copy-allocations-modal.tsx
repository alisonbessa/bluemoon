'use client';

import { Copy, Plus } from 'lucide-react';
import { FormModalWrapper } from '@/shared/molecules';
import { cn } from '@/shared/lib/utils';

type CopyMode = 'all' | 'empty_only';

interface CopyAllocationsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (mode: CopyMode) => void;
  copyMode: CopyMode | null;
  onCopyModeChange: (mode: CopyMode) => void;
  isCopying: boolean;
  currentMonthName: string;
  previousMonthName: string;
}

/**
 * CopyAllocationsModal - Modal for copying allocations from previous month
 *
 * Provides two options:
 * - "all": Overwrites all existing allocations
 * - "empty_only": Only copies to categories without allocations
 */
export function CopyAllocationsModal({
  open,
  onOpenChange,
  onConfirm,
  copyMode,
  onCopyModeChange,
  isCopying,
  currentMonthName,
  previousMonthName,
}: CopyAllocationsModalProps) {
  const handleClose = () => {
    if (!isCopying) {
      onOpenChange(false);
    }
  };

  return (
    <FormModalWrapper
      open={open}
      onOpenChange={handleClose}
      title="Copiar do mês anterior"
      description={`O mês de ${currentMonthName} já possui algumas alocações. Como você deseja copiar os valores de ${previousMonthName}?`}
      size="sm"
      isSubmitting={isCopying}
      onSubmit={() => copyMode && onConfirm(copyMode)}
      submitLabel="Confirmar"
      submitDisabled={!copyMode}
    >
      <div className="flex flex-col gap-3">
        {/* Option: Copy all */}
        <button
          type="button"
          className={cn(
            'flex items-start gap-3 p-3 rounded-lg border text-left transition-colors',
            copyMode === 'all'
              ? 'border-primary bg-primary/5'
              : 'border-muted hover:bg-muted/50'
          )}
          onClick={() => onCopyModeChange('all')}
          disabled={isCopying}
        >
          <Copy className="h-4 w-4 mt-0.5 text-muted-foreground" />
          <div>
            <div className="font-medium text-sm">Copiar todos os valores</div>
            <div className="text-xs text-muted-foreground">
              Sobrescreve todo o planejamento existente
            </div>
          </div>
        </button>

        {/* Option: Copy empty only */}
        <button
          type="button"
          className={cn(
            'flex items-start gap-3 p-3 rounded-lg border text-left transition-colors',
            copyMode === 'empty_only'
              ? 'border-primary bg-primary/5'
              : 'border-muted hover:bg-muted/50'
          )}
          onClick={() => onCopyModeChange('empty_only')}
          disabled={isCopying}
        >
          <Plus className="h-4 w-4 mt-0.5 text-muted-foreground" />
          <div>
            <div className="font-medium text-sm">Copiar somente para o que está vazio</div>
            <div className="text-xs text-muted-foreground">
              Mantém valores já planejados
            </div>
          </div>
        </button>
      </div>
    </FormModalWrapper>
  );
}
