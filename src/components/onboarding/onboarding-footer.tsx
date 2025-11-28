"use client";

import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, Loader2 } from "lucide-react";

interface OnboardingFooterProps {
  onBack?: () => void;
  onNext: () => void;
  nextLabel?: string;
  nextDisabled?: boolean;
  showBack?: boolean;
  isLoading?: boolean;
}

export function OnboardingFooter({
  onBack,
  onNext,
  nextLabel = "Proximo",
  nextDisabled = false,
  showBack = true,
  isLoading = false,
}: OnboardingFooterProps) {
  return (
    <div className="flex items-center justify-between pt-6 border-t">
      {showBack && onBack ? (
        <Button
          type="button"
          variant="ghost"
          onClick={onBack}
          disabled={isLoading}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>
      ) : (
        <div />
      )}
      <Button
        type="button"
        onClick={onNext}
        disabled={nextDisabled || isLoading}
      >
        {isLoading ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : null}
        {nextLabel}
        {!isLoading && <ArrowRight className="ml-2 h-4 w-4" />}
      </Button>
    </div>
  );
}
