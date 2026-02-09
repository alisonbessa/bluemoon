'use client';

import { Button } from '@/shared/ui/button';
import { Loader2, Copy } from 'lucide-react';
import { FormModalWrapper } from '@/shared/molecules';

interface CopyHintModalProps {
  open: boolean;
  onDismiss: () => void;
  onCopy: () => void;
  isCopying: boolean;
  currentMonthName: string;
  previousMonthName: string;
}

export function CopyHintModal({
  open,
  onDismiss,
  onCopy,
  isCopying,
  currentMonthName,
  previousMonthName,
}: CopyHintModalProps) {
  return (
    <FormModalWrapper
      open={open}
      onOpenChange={(isOpen) => !isOpen && onDismiss()}
      title="Copiar planejamento anterior"
      description={`Parece que ${currentMonthName} ainda não tem um planejamento definido.`}
      footer={
        <div className="flex flex-col sm:flex-row justify-end gap-2">
          <Button variant="outline" onClick={onDismiss} className="w-full sm:w-auto">
            Fazer manualmente
          </Button>
          <Button
            onClick={() => {
              onDismiss();
              onCopy();
            }}
            disabled={isCopying}
            className="w-full sm:w-auto"
          >
            {isCopying ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Copy className="mr-2 h-4 w-4" />
            )}
            Copiar de {previousMonthName}
          </Button>
        </div>
      }
    >
      <p className="text-sm text-muted-foreground">
        Você pode copiar o planejamento de{' '}
        <span className="font-medium text-foreground">
          {previousMonthName}
        </span>{' '}
        para começar rapidamente, ou definir os valores manualmente clicando em cada categoria.
      </p>
    </FormModalWrapper>
  );
}
