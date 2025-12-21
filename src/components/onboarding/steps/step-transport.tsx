"use client";

import { OnboardingCard } from "../onboarding-card";
import { OnboardingFooter } from "../onboarding-footer";

type TransportType =
  | "car"
  | "motorcycle"
  | "public"
  | "apps"
  | "bike"
  | "walk";

interface StepTransportProps {
  transport: TransportType[];
  onToggleTransport: (value: TransportType) => void;
  onNext: () => void;
  onBack: () => void;
}

const TRANSPORT_OPTIONS: {
  value: TransportType;
  icon: string;
  label: string;
  description: string;
}[] = [
  {
    value: "car",
    icon: "🚗",
    label: "Carro próprio",
    description: "Combustível, manutenção, seguro",
  },
  {
    value: "motorcycle",
    icon: "🏍️",
    label: "Moto",
    description: "Combustível e manutenção",
  },
  {
    value: "public",
    icon: "🚌",
    label: "Transporte público",
    description: "Ônibus, metrô, trem",
  },
  {
    value: "apps",
    icon: "📱",
    label: "Aplicativos (Uber/99)",
    description: "Corridas por aplicativo",
  },
  {
    value: "bike",
    icon: "🚲",
    label: "Bicicleta",
    description: "Manutenção ocasional",
  },
  {
    value: "walk",
    icon: "🚶",
    label: "A pé (principalmente)",
    description: "Sem custos de transporte",
  },
];

export function StepTransport({
  transport,
  onToggleTransport,
  onNext,
  onBack,
}: StepTransportProps) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 px-4">
        <div className="text-center mb-8">
          <div className="text-4xl mb-4">🚗</div>
          <h2 className="text-2xl font-bold mb-2">
            Como você se locomove?
          </h2>
          <p className="text-muted-foreground">
            Selecione todos os meios de transporte que você usa
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl mx-auto">
          {TRANSPORT_OPTIONS.map((option) => (
            <OnboardingCard
              key={option.value}
              icon={option.icon}
              label={option.label}
              description={option.description}
              selected={transport.includes(option.value)}
              onClick={() => onToggleTransport(option.value)}
            />
          ))}
        </div>
      </div>

      <OnboardingFooter
        onNext={onNext}
        onBack={onBack}
        nextDisabled={transport.length === 0}
      />
    </div>
  );
}
