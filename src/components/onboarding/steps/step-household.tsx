"use client";

import { OnboardingCard } from "../onboarding-card";
import { OnboardingFooter } from "../onboarding-footer";
import { HouseholdData } from "../hooks/use-onboarding";

interface StepHouseholdProps {
  household: HouseholdData;
  onTogglePartner: () => void;
  onToggleKids: () => void;
  onToggleTeens: () => void;
  onToggleOtherAdults: () => void;
  onTogglePets: () => void;
  onNext: () => void;
  onBack: () => void;
}

const HOUSEHOLD_OPTIONS = [
  {
    key: "myself",
    icon: "👤",
    label: "Eu mesmo(a)",
    description: "Voce e o dono do orcamento",
  },
  {
    key: "partner",
    icon: "💑",
    label: "Meu/minha parceiro(a)",
    description: "Compartilhe o orcamento",
  },
  {
    key: "kids",
    icon: "👶",
    label: "Filhos(as)",
    description: "Criancas pequenas",
  },
  {
    key: "teens",
    icon: "🧑",
    label: "Adolescentes",
    description: "Jovens da familia",
  },
  {
    key: "otherAdults",
    icon: "👨‍👩‍👧",
    label: "Outros adultos",
    description: "Pais, irmaos, etc",
  },
  {
    key: "pets",
    icon: "🐕",
    label: "Pets",
    description: "Animais de estimacao",
  },
] as const;

export function StepHousehold({
  household,
  onTogglePartner,
  onToggleKids,
  onToggleTeens,
  onToggleOtherAdults,
  onTogglePets,
  onNext,
  onBack,
}: StepHouseholdProps) {
  const getIsSelected = (key: string) => {
    switch (key) {
      case "myself":
        return true;
      case "partner":
        return household.hasPartner;
      case "kids":
        return household.kids.length > 0;
      case "teens":
        return household.teens.length > 0;
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
      case "kids":
        onToggleKids();
        break;
      case "teens":
        onToggleTeens();
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
            Quem faz parte do seu orcamento?
          </h2>
          <p className="text-muted-foreground">
            Selecione todos que compartilham as financas com voce
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
              disabled={option.key === "myself"}
              onClick={() => handleClick(option.key)}
            />
          ))}
        </div>
      </div>

      <OnboardingFooter onNext={onNext} onBack={onBack} />
    </div>
  );
}
