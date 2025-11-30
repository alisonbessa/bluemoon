"use client";

import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { useTutorial } from "./tutorial-provider";
import { ChevronRight, X, Check } from "lucide-react";

interface SpotlightRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

interface TutorialTooltipProps {
  spotlightRect: SpotlightRect | null;
}

export function TutorialTooltip({ spotlightRect }: TutorialTooltipProps) {
  const {
    currentStep,
    stepIndex,
    totalSteps,
    pageStepIndex,
    pageStepsTotal,
    isLastPageStep,
    nextStep,
    dismissPageTutorial,
    skipTutorial,
    completeTutorial,
  } = useTutorial();

  const position = useMemo(() => {
    if (!currentStep) return {};

    const placement = currentStep.placement || "center";

    // If no spotlight or centered, show in center of screen
    if (!spotlightRect || placement === "center") {
      return {
        left: "50%",
        top: "50%",
        transform: "translate(-50%, -50%)",
      };
    }

    const tooltipWidth = 384; // w-96 = 24rem = 384px
    const tooltipHeight = 200; // approximate
    const gap = 16;

    let top = 0;
    let left = 0;

    switch (placement) {
      case "bottom":
        top = spotlightRect.top + spotlightRect.height + gap;
        left = spotlightRect.left + spotlightRect.width / 2 - tooltipWidth / 2;
        break;
      case "top":
        top = spotlightRect.top - tooltipHeight - gap;
        left = spotlightRect.left + spotlightRect.width / 2 - tooltipWidth / 2;
        break;
      case "left":
        top = spotlightRect.top + spotlightRect.height / 2 - tooltipHeight / 2;
        left = spotlightRect.left - tooltipWidth - gap;
        break;
      case "right":
        top = spotlightRect.top + spotlightRect.height / 2 - tooltipHeight / 2;
        left = spotlightRect.left + spotlightRect.width + gap;
        break;
    }

    // Keep tooltip within viewport bounds
    const padding = 16;
    left = Math.max(padding, Math.min(left, window.innerWidth - tooltipWidth - padding));
    top = Math.max(padding, Math.min(top, window.innerHeight - tooltipHeight - padding));

    return { top, left };
  }, [currentStep, spotlightRect]);

  if (!currentStep) return null;

  const isLastStep = stepIndex === totalSteps - 1;

  // Determine button action and label
  const getButtonConfig = () => {
    if (isLastStep) {
      // Last step of entire tutorial
      return {
        label: "Concluir",
        icon: <Check className="h-4 w-4" />,
        action: completeTutorial,
      };
    }

    if (isLastPageStep) {
      // Last step of current page - dismiss and let user interact
      return {
        label: "Entendi",
        icon: <Check className="h-4 w-4" />,
        action: dismissPageTutorial,
      };
    }

    // More steps on this page
    return {
      label: "Próximo",
      icon: <ChevronRight className="h-4 w-4" />,
      action: nextStep,
    };
  };

  const buttonConfig = getButtonConfig();

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
      <div className="p-4">
        <p className="text-sm text-muted-foreground">{currentStep.content}</p>

        {/* Show hint for last page step */}
        {isLastPageStep && !isLastStep && (
          <p className="text-xs text-primary mt-3">
            Após clicar em &quot;Entendi&quot;, explore a página. O tutorial continua quando você navegar para a próxima seção.
          </p>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between p-4 border-t border-border bg-muted/30 rounded-b-xl">
        <div className="flex flex-col gap-1">
          {/* Page progress */}
          <div className="flex items-center gap-1">
            {Array.from({ length: pageStepsTotal }).map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all ${
                  i === pageStepIndex
                    ? "w-4 bg-primary"
                    : i < pageStepIndex
                      ? "w-2 bg-primary/50"
                      : "w-2 bg-muted-foreground/30"
                }`}
              />
            ))}
          </div>
          {/* Overall progress text */}
          <span className="text-xs text-muted-foreground">
            {stepIndex + 1} de {totalSteps}
          </span>
        </div>

        <Button size="sm" onClick={buttonConfig.action} className="gap-1">
          {buttonConfig.label}
          {buttonConfig.icon}
        </Button>
      </div>
    </div>
  );
}
