'use client';

import { Button } from '@/shared/ui/button';
import { Loader2, Copy } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog';

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
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onDismiss()}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Copy className="h-5 w-5 text-primary" />
            Copiar planejamento anterior
          </DialogTitle>
          <DialogDescription>
            Parece que {currentMonthName} ainda não tem um planejamento definido.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <p className="text-sm text-muted-foreground">
            Você pode copiar o planejamento de{' '}
            <span className="font-medium text-foreground">
              {previousMonthName}
            </span>{' '}
            para começar rapidamente, ou definir os valores manualmente clicando em cada categoria.
          </p>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
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
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
