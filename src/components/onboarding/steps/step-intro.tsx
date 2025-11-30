"use client";

import { Button } from "@/components/ui/button";

interface StepIntroProps {
  onNext: () => void;
  onSkip: () => void;
}

export function StepIntro({ onNext, onSkip }: StepIntroProps) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
        <div className="text-6xl mb-6">🐝</div>
        <h2 className="text-3xl font-bold mb-4">
          Vamos organizar suas finanças!
        </h2>
        <p className="text-muted-foreground mb-4 max-w-md text-lg">
          Nos próximos minutos, vamos configurar seu orçamento personalizado.
        </p>
        <div className="bg-primary/10 dark:bg-primary/20 rounded-lg p-4 max-w-md mb-8">
          <p className="text-sm text-foreground">
            <strong>Por que isso é importante?</strong> Um bom planejamento financeiro
            traz clareza sobre seus gastos e ajuda você a alcançar seus objetivos.
            Dedique esses 5 minutos agora e colha os frutos depois!
          </p>
        </div>

        <div className="flex flex-col gap-3 w-full max-w-xs">
          <Button onClick={onNext} size="lg" className="w-full">
            Começar configuração
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onSkip}
            className="text-muted-foreground hover:text-foreground"
          >
            Pular por agora
          </Button>
        </div>
      </div>
    </div>
  );
}
