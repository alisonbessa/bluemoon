"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { OnboardingFooter } from "../onboarding-footer";
import { X } from "lucide-react";

interface StepWelcomeProps {
  displayName: string;
  onDisplayNameChange: (value: string) => void;
  onNext: () => void;
  onSkip?: () => void;
}

export function StepWelcome({
  displayName,
  onDisplayNameChange,
  onNext,
  onSkip,
}: StepWelcomeProps) {
  const isValid = displayName.trim().length >= 2;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && isValid) {
      e.preventDefault();
      onNext();
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Skip button */}
      {onSkip && (
        <div className="absolute top-4 right-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={onSkip}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4 mr-1" />
            Pular
          </Button>
        </div>
      )}

      <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
        <div className="text-6xl mb-6">👋</div>
        <h2 className="text-2xl font-bold mb-2">
          Bem-vindo ao HiveBudget!
        </h2>
        <p className="text-muted-foreground mb-8 max-w-md">
          Vamos configurar seu orçamento em poucos minutos. Primeiro, como
          gostaria que te chamássemos?
        </p>

        <div className="w-full max-w-sm">
          <Label htmlFor="displayName" className="sr-only">
            Como gostaria que te chamássemos?
          </Label>
          <Input
            id="displayName"
            type="text"
            placeholder="Seu nome ou apelido"
            value={displayName}
            onChange={(e) => onDisplayNameChange(e.target.value)}
            onKeyDown={handleKeyDown}
            className="text-center text-lg py-6"
            autoFocus
          />
        </div>
      </div>

      <OnboardingFooter
        onNext={onNext}
        nextDisabled={!isValid}
        showBack={false}
        nextLabel="Começar"
      />
    </div>
  );
}
