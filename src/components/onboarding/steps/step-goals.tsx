"use client";

import { Input } from "@/components/ui/input";
import { OnboardingCard } from "../onboarding-card";
import { OnboardingFooter } from "../onboarding-footer";

interface StepGoalsProps {
  goals: string[];
  customGoal: string;
  onToggleGoal: (value: string) => void;
  onCustomGoalChange: (value: string) => void;
  onNext: () => void;
  onBack: () => void;
}

const GOAL_OPTIONS = [
  {
    value: "travel",
    icon: "✈️",
    label: "Viagem dos sonhos",
    description: "Aquela viagem especial",
  },
  {
    value: "house",
    icon: "🏠",
    label: "Casa própria",
    description: "Entrada ou imóvel completo",
  },
  {
    value: "car",
    icon: "🚗",
    label: "Carro novo",
    description: "Trocar ou comprar veículo",
  },
  {
    value: "wedding",
    icon: "💒",
    label: "Casamento",
    description: "Cerimônia e festa",
  },
  {
    value: "education",
    icon: "🎓",
    label: "Faculdade/Curso",
    description: "Investir em conhecimento",
  },
  {
    value: "emergency",
    icon: "🛡️",
    label: "Reserva de emergência",
    description: "Segurança financeira",
  },
  {
    value: "retirement",
    icon: "👴",
    label: "Aposentadoria",
    description: "Futuro tranquilo",
  },
  {
    value: "other",
    icon: "➕",
    label: "Outro",
    description: "Meta personalizada",
  },
];

export function StepGoals({
  goals,
  customGoal,
  onToggleGoal,
  onCustomGoalChange,
  onNext,
  onBack,
}: StepGoalsProps) {
  const showCustomInput = goals.includes("other");

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      onNext();
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 px-4 overflow-y-auto">
        <div className="text-center mb-8">
          <div className="text-4xl mb-4">🎯</div>
          <h2 className="text-2xl font-bold mb-2">
            Você tem algum sonho ou meta financeira?
          </h2>
          <p className="text-muted-foreground">
            Vamos criar categorias para suas metas
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl mx-auto">
          {GOAL_OPTIONS.map((option) => (
            <OnboardingCard
              key={option.value}
              icon={option.icon}
              label={option.label}
              description={option.description}
              selected={goals.includes(option.value)}
              onClick={() => onToggleGoal(option.value)}
            />
          ))}
        </div>

        {showCustomInput && (
          <div className="max-w-xl mx-auto mt-4">
            <Input
              value={customGoal}
              onChange={(e) => onCustomGoalChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Qual é sua meta personalizada?"
              className="w-full"
              autoFocus
            />
          </div>
        )}
      </div>

      <OnboardingFooter onNext={onNext} onBack={onBack} />
    </div>
  );
}
