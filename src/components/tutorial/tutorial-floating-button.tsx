"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useTutorial } from "./tutorial-provider";
import { ArrowRight, X, ChevronUp, ChevronDown, Sparkles, Eye } from "lucide-react";
import { cn } from "@/lib/utils";

export function TutorialFloatingButton() {
  const {
    currentStep,
    stepIndex,
    totalSteps,
    isWaitingForAction,
    goToNextPage,
    skipTutorial,
    completeTutorial,
    resumeTutorial,
  } = useTutorial();

  const [isExpanded, setIsExpanded] = useState(false);

  if (!currentStep) return null;

  const isLastStep = stepIndex === totalSteps - 1;

  const handleNextClick = () => {
    if (isLastStep) {
      completeTutorial();
    } else {
      goToNextPage();
    }
  };

  const handleShowInstructions = () => {
    setIsExpanded(false);
    resumeTutorial();
  };

  // Get a short description for the current page
  const getPageLabel = () => {
    if (currentStep.route.includes("accounts")) return "Contas";
    if (currentStep.route.includes("income")) return "Rendas";
    if (currentStep.route.includes("categories")) return "Categorias";
    if (currentStep.route.includes("goals")) return "Metas";
    if (currentStep.route.includes("budget")) return "Orçamento";
    return "Configuração";
  };

  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col items-end gap-2">
      {/* Expanded content */}
      {isExpanded && (
        <div className="bg-card border border-border rounded-xl shadow-2xl p-4 w-80 animate-in slide-in-from-bottom-2 fade-in-0 duration-200">
          <div className="flex items-start justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="font-medium text-sm">Tutorial - {getPageLabel()}</span>
            </div>
            <button
              onClick={() => setIsExpanded(false)}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronDown className="h-4 w-4" />
            </button>
          </div>

          <h4 className="font-medium text-sm mb-1">{currentStep.title}</h4>
          <p className="text-sm text-muted-foreground mb-4">
            {currentStep.content}
          </p>

          {/* Show "Ver instruções" button if not waiting for action (means user dismissed the overlay) */}
          {!isWaitingForAction && (
            <button
              onClick={handleShowInstructions}
              className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors mb-3"
            >
              <Eye className="h-3.5 w-3.5" />
              Ver instruções na tela
            </button>
          )}

          <div className="flex items-center justify-between">
            <button
              onClick={skipTutorial}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Pular tutorial
            </button>
            <Button size="sm" onClick={handleNextClick} className="gap-1.5">
              {isLastStep ? "Concluir" : "Próxima Etapa"}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Floating button - always visible */}
      <div
        className={cn(
          "flex items-center gap-2 bg-primary text-primary-foreground rounded-full shadow-lg cursor-pointer transition-all hover:shadow-xl hover:scale-105",
          isExpanded ? "px-4 py-2" : "px-4 py-3"
        )}
        onClick={() => !isExpanded && setIsExpanded(true)}
      >
        {!isExpanded && (
          <>
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              <span className="font-medium">
                {isLastStep ? "Concluir Tutorial" : "Próxima Etapa"}
              </span>
              <span className="text-primary-foreground/70 text-sm">
                ({stepIndex + 1}/{totalSteps})
              </span>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleNextClick();
              }}
              className="ml-2 bg-primary-foreground/20 hover:bg-primary-foreground/30 rounded-full p-1.5 transition-colors"
            >
              <ArrowRight className="h-4 w-4" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsExpanded(true);
              }}
              className="bg-primary-foreground/20 hover:bg-primary-foreground/30 rounded-full p-1.5 transition-colors"
            >
              <ChevronUp className="h-4 w-4" />
            </button>
          </>
        )}

        {isExpanded && (
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">
              Passo {stepIndex + 1} de {totalSteps}
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                skipTutorial();
              }}
              className="bg-primary-foreground/20 hover:bg-primary-foreground/30 rounded-full p-1 transition-colors"
              title="Fechar tutorial"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
