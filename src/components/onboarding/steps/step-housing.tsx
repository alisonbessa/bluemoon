"use client";

import { OnboardingCard } from "../onboarding-card";
import { OnboardingFooter } from "../onboarding-footer";

type HousingType = "rent" | "mortgage" | "owned" | "free" | null;

interface StepHousingProps {
  housing: HousingType;
  onHousingChange: (value: HousingType) => void;
  onNext: () => void;
  onBack: () => void;
}

const HOUSING_OPTIONS: {
  value: HousingType;
  icon: string;
  label: string;
  description: string;
}[] = [
  {
    value: "rent",
    icon: "🏠",
    label: "Eu alugo",
    description: "Pago aluguel mensalmente",
  },
  {
    value: "mortgage",
    icon: "🏦",
    label: "Tenho imovel financiado",
    description: "Pago prestacao do financiamento",
  },
  {
    value: "owned",
    icon: "🏡",
    label: "Tenho imovel quitado",
    description: "Pago IPTU e condominio",
  },
  {
    value: "free",
    icon: "👨‍👩‍👧",
    label: "Moro com familia/sem custo fixo",
    description: "Nao tenho custo de moradia",
  },
];

export function StepHousing({
  housing,
  onHousingChange,
  onNext,
  onBack,
}: StepHousingProps) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 px-4">
        <div className="text-center mb-8">
          <div className="text-4xl mb-4">🏠</div>
          <h2 className="text-2xl font-bold mb-2">
            Conte-nos sobre sua moradia
          </h2>
          <p className="text-muted-foreground">
            Isso nos ajuda a criar as categorias certas para voce
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 max-w-md mx-auto">
          {HOUSING_OPTIONS.map((option) => (
            <OnboardingCard
              key={option.value}
              icon={option.icon}
              label={option.label}
              description={option.description}
              selected={housing === option.value}
              onClick={() => onHousingChange(option.value)}
            />
          ))}
        </div>
      </div>

      <OnboardingFooter
        onNext={onNext}
        onBack={onBack}
        nextDisabled={housing === null}
      />
    </div>
  );
}
