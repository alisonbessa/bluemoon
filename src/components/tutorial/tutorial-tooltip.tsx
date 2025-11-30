"use client";

import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { useTutorial } from "./tutorial-provider";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

interface TutorialTooltipProps {
  targetRect: DOMRect | null;
}

export function TutorialTooltip({ targetRect }: TutorialTooltipProps) {
  const {
    currentStep,
    stepIndex,
    totalSteps,
    nextStep,
    previousStep,
    skipTutorial,
  } = useTutorial();

  const position = useMemo(() => {
    const isCentered =
      currentStep?.placement === "center" || !currentStep?.target;

    if (isCentered || !targetRect) {
      // Center in viewport
      return {
        left: "50%",
        top: "50%",
        transform: "translate(-50%, -50%)",
      };
    }

    const tooltipWidth = 320;
    const tooltipHeight = 180;
    const gap = 16;
    const viewportPadding = 16;

    let left = 0;
    let top = 0;

    switch (currentStep?.placement) {
      case "top":
        left = targetRect.left + targetRect.width / 2 - tooltipWidth / 2;
        top = targetRect.top - tooltipHeight - gap;
        break;
      case "bottom":
        left = targetRect.left + targetRect.width / 2 - tooltipWidth / 2;
        top = targetRect.bottom + gap;
        break;
      case "left":
        left = targetRect.left - tooltipWidth - gap;
        top = targetRect.top + targetRect.height / 2 - tooltipHeight / 2;
        break;
      case "right":
        left = targetRect.right + gap;
        top = targetRect.top + targetRect.height / 2 - tooltipHeight / 2;
        break;
      default:
        // Default to bottom
        left = targetRect.left + targetRect.width / 2 - tooltipWidth / 2;
        top = targetRect.bottom + gap;
    }

    // Keep within viewport
    left = Math.max(
      viewportPadding,
      Math.min(left, window.innerWidth - tooltipWidth - viewportPadding)
    );
    top = Math.max(
      viewportPadding,
      Math.min(top, window.innerHeight - tooltipHeight - viewportPadding)
    );

    return {
      left: `${left}px`,
      top: `${top}px`,
      transform: "none",
    };
  }, [targetRect, currentStep]);

  if (!currentStep) return null;

  const isLastStep = stepIndex === totalSteps - 1;
  const isFirstStep = stepIndex === 0;

  return (
    <div
      className="absolute w-80 bg-card border border-border rounded-xl shadow-2xl pointer-events-auto animate-in fade-in-0 zoom-in-95 duration-200"
      style={position}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <h3 className="font-semibold text-foreground">{currentStep.title}</h3>
        <button
          onClick={skipTutorial}
          className="text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Pular tutorial"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Content */}
      <div className="p-4">
        <p className="text-sm text-muted-foreground">{currentStep.content}</p>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between p-4 border-t border-border bg-muted/30 rounded-b-xl">
        <div className="flex items-center gap-1">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i === stepIndex
                  ? "w-4 bg-primary"
                  : i < stepIndex
                    ? "w-1.5 bg-primary/50"
                    : "w-1.5 bg-muted-foreground/30"
              }`}
            />
          ))}
        </div>

        <div className="flex items-center gap-2">
          {!isFirstStep && (
            <Button
              variant="ghost"
              size="sm"
              onClick={previousStep}
              className="gap-1"
            >
              <ChevronLeft className="h-4 w-4" />
              Voltar
            </Button>
          )}
          <Button size="sm" onClick={nextStep} className="gap-1">
            {isLastStep ? "Concluir" : "Avançar"}
            {!isLastStep && <ChevronRight className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
}
