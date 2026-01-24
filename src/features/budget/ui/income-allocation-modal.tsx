'use client';

import { Undo2 } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { FormModalWrapper, INCOME_TYPE_CONFIG } from '@/shared/molecules';
import { formatCurrency } from '@/features/budget/types';

interface IncomeSource {
  id: string;
  name: string;
  type: 'salary' | 'benefit' | 'freelance' | 'rental' | 'investment' | 'other';
}

interface IncomeAllocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => Promise<void>;
  isSaving: boolean;

  // Income source info
  incomeSource: IncomeSource | null;
  monthName: string;
  year: number;

  // Form values
  inputValue: string;
  onInputValueChange: (value: string) => void;

  // Default value info
  defaultAmount: number;
  isEdited: boolean;
  onResetToDefault: () => void;
}

/**
 * IncomeAllocationModal - Modal for editing monthly income allocation
 */
export function IncomeAllocationModal({
  isOpen,
  onClose,
  onSave,
  isSaving,
  incomeSource,
  monthName,
  year,
  inputValue,
  onInputValueChange,
  defaultAmount,
  isEdited,
  onResetToDefault,
}: IncomeAllocationModalProps) {
  if (!incomeSource) return null;

  const icon = INCOME_TYPE_CONFIG[incomeSource.type]?.icon || '💵';

  return (
    <FormModalWrapper
      open={isOpen}
      onOpenChange={(open) => !open && onClose()}
      title={`${icon} ${incomeSource.name}`}
      description={`Editar valor planejado para ${monthName} ${year}`}
      isSubmitting={isSaving}
      onSubmit={onSave}
      submitLabel="Salvar"
    >
      <div className="grid gap-4">
        {/* Value Input */}
        <div className="grid gap-2">
          <Label htmlFor="incomeValue">Valor Planejado</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
              R$
            </span>
            <Input
              id="incomeValue"
              className="pl-9"
              placeholder="0,00"
              value={inputValue}
              onChange={(e) => onInputValueChange(e.target.value)}
              onFocus={(e) => e.target.select()}
              autoFocus
            />
          </div>
          {isEdited && (
            <p className="text-xs text-muted-foreground">
              Valor padrão: {formatCurrency(defaultAmount)}
            </p>
          )}
        </div>

        {/* Reset to default button */}
        {isEdited && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="justify-start"
            onClick={onResetToDefault}
          >
            <Undo2 className="h-4 w-4 mr-2" />
            Restaurar valor padrão
          </Button>
        )}
      </div>
    </FormModalWrapper>
  );
}
