"use client";

import { Button } from "@/components/ui/button";
import { useTutorial } from "./tutorial-provider";
import { ChevronRight, X, CheckCircle2 } from "lucide-react";

export function TutorialTooltip() {
  const {
    currentStep,
    stepIndex,
    totalSteps,
    nextStep,
    skipTutorial,
  } = useTutorial();

  if (!currentStep) return null;

  const isLastStep = stepIndex === totalSteps - 1;

  // Always center the tooltip (one per page design)
  const position = {
    left: "50%",
    top: "50%",
    transform: "translate(-50%, -50%)",
  };

  return (
    <div
      className="absolute w-96 max-w-[90vw] bg-card border border-border rounded-xl shadow-2xl pointer-events-auto animate-in fade-in-0 zoom-in-95 duration-200"
      style={position}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold">
            {stepIndex + 1}
          </span>
          <h3 className="font-semibold text-foreground">{currentStep.title}</h3>
        </div>
        <button
          onClick={skipTutorial}
          className="text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Pular tutorial"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        <p className="text-sm text-muted-foreground">{currentStep.content}</p>

        {/* Tips */}
        {currentStep.tips && currentStep.tips.length > 0 && (
          <div className="space-y-2 pt-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              O que fazer:
            </p>
            <ul className="space-y-1.5">
              {currentStep.tips.map((tip, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between p-4 border-t border-border bg-muted/30 rounded-b-xl">
        <div className="flex items-center gap-1">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i === stepIndex
                  ? "w-6 bg-primary"
                  : i < stepIndex
                    ? "w-2 bg-primary/50"
                    : "w-2 bg-muted-foreground/30"
              }`}
            />
          ))}
          <span className="ml-2 text-xs text-muted-foreground">
            {stepIndex + 1} de {totalSteps}
          </span>
        </div>

        <Button size="sm" onClick={nextStep} className="gap-1">
          {currentStep.nextLabel || (isLastStep ? "Concluir" : "Avançar")}
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
