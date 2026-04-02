'use client';

import { X, Lightbulb } from 'lucide-react';
import { Button } from '@/shared/ui/button';

interface SetupTipProps {
  title: string;
  description: string;
  onDismiss: () => void;
}

/**
 * Contextual setup tip banner shown when user arrives via checklist (?setup=true).
 * Explains what to do on this page as part of the getting-started flow.
 */
export function SetupTip({ title, description, onDismiss }: SetupTipProps) {
  return (
    <div className="rounded-lg border-2 border-dashed border-primary/30 bg-primary/5 p-4 mb-4">
      <div className="flex items-start gap-3">
        <div className="rounded-full p-2 bg-primary/10 shrink-0">
          <Lightbulb className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm">{title}</h3>
          <p className="text-sm text-muted-foreground mt-1">{description}</p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 shrink-0 text-muted-foreground hover:text-foreground"
          onClick={onDismiss}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
