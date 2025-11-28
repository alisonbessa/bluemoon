"use client";

import { cn } from "@/lib/utils";

interface OnboardingProgressProps {
  currentStep: number;
  totalSteps: number;
}

export function OnboardingProgress({
  currentStep,
  totalSteps,
}: OnboardingProgressProps) {
  return (
    <div className="flex gap-1.5 w-full">
      {Array.from({ length: totalSteps }).map((_, index) => (
        <div
          key={index}
          className={cn(
            "h-1 flex-1 rounded-full transition-colors duration-300",
            index < currentStep
              ? "bg-primary"
              : index === currentStep
                ? "bg-primary/60"
                : "bg-muted"
          )}
        />
      ))}
    </div>
  );
}
