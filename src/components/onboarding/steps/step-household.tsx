"use client";

import { OnboardingCard } from "../onboarding-card";
import { OnboardingFooter } from "../onboarding-footer";
import { HouseholdData } from "../hooks/use-onboarding";

interface StepHouseholdProps {
  household: HouseholdData;
  onTogglePartner: () => void;
  onToggleChildren: () => void;
  onToggleOtherAdults: () => void;
  onTogglePets: () => void;
  onNext: () => void;
  onBack: () => void;
}

const HOUSEHOLD_OPTIONS = [
  {
    key: "partner",
    icon: "💑",
    label: "Meu/minha parceiro(a)",
    description: "Compartilhe o orçamento",
  },
  {
    key: "children",
    icon: "👶",
    label: "Filhos",
    description: "Crianças ou adolescentes",
  },
  {
    key: "otherAdults",
    icon: "👨‍👩‍👧",
    label: "Outros adultos",
    description: "Pais, irmãos, etc",
  },
  {
    key: "pets",
    icon: "🐕",
    label: "Pets",
    description: "Animais de estimação",
  },
] as const;

export function StepHousehold({
  household,
  onTogglePartner,
  onToggleChildren,
  onToggleOtherAdults,
  onTogglePets,
  onNext,
  onBack,
}: StepHouseholdProps) {
  const getIsSelected = (key: string) => {
    switch (key) {
      case "partner":
        return household.hasPartner;
      case "children":
        return household.children.length > 0;
      case "otherAdults":
        return household.otherAdults.length > 0;
      case "pets":
        return household.pets.length > 0;
      default:
        return false;
    }
  };

  const handleClick = (key: string) => {
    switch (key) {
      case "partner":
        onTogglePartner();
        break;
      case "children":
        onToggleChildren();
        break;
      case "otherAdults":
        onToggleOtherAdults();
        break;
      case "pets":
        onTogglePets();
        break;
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 px-4">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold mb-2">
            Quem mais faz parte do seu orçamento?
          </h2>
          <p className="text-muted-foreground">
            Selecione todos que compartilham as finanças com você
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl mx-auto">
          {HOUSEHOLD_OPTIONS.map((option) => (
            <OnboardingCard
              key={option.key}
              icon={option.icon}
              label={option.label}
              description={option.description}
              selected={getIsSelected(option.key)}
              onClick={() => handleClick(option.key)}
            />
          ))}
        </div>
      </div>

      <OnboardingFooter onNext={onNext} onBack={onBack} />
    </div>
  );
}
