"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { OnboardingFooter } from "../onboarding-footer";

interface StepWelcomeProps {
  displayName: string;
  onDisplayNameChange: (value: string) => void;
  onNext: () => void;
}

export function StepWelcome({
  displayName,
  onDisplayNameChange,
  onNext,
}: StepWelcomeProps) {
  const isValid = displayName.trim().length >= 2;

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 flex flex-col items-center justify-center text-center px-4">
        <div className="text-6xl mb-6">👋</div>
        <h2 className="text-2xl font-bold mb-2">
          Bem-vindo ao HiveBudget!
        </h2>
        <p className="text-muted-foreground mb-8 max-w-md">
          Vamos configurar seu orcamento em poucos minutos. Primeiro, como
          gostaria que te chamassemos?
        </p>

        <div className="w-full max-w-sm">
          <Label htmlFor="displayName" className="sr-only">
            Como gostaria que te chamassemos?
          </Label>
          <Input
            id="displayName"
            type="text"
            placeholder="Seu nome ou apelido"
            value={displayName}
            onChange={(e) => onDisplayNameChange(e.target.value)}
            className="text-center text-lg py-6"
            autoFocus
          />
        </div>
      </div>

      <OnboardingFooter
        onNext={onNext}
        nextDisabled={!isValid}
        showBack={false}
        nextLabel="Comecar"
      />
    </div>
  );
}
