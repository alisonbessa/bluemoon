"use client";

import { OnboardingCard } from "../onboarding-card";
import { OnboardingFooter } from "../onboarding-footer";

interface StepDebtProps {
  debts: string[];
  onToggleDebt: (value: string) => void;
  onNext: () => void;
  onBack: () => void;
}

const DEBT_OPTIONS = [
  {
    value: "credit_card",
    icon: "💳",
    label: "Cartao de credito",
    description: "Parcelado ou rotativo",
  },
  {
    value: "personal_loan",
    icon: "🏦",
    label: "Emprestimo pessoal",
    description: "Banco ou financeira",
  },
  {
    value: "car_loan",
    icon: "🚗",
    label: "Financiamento de veiculo",
    description: "Carro ou moto",
  },
  {
    value: "student_loan",
    icon: "🎓",
    label: "Emprestimo estudantil",
    description: "FIES, credito universitario",
  },
  {
    value: "medical",
    icon: "🏥",
    label: "Divida medica",
    description: "Hospital, tratamentos",
  },
  {
    value: "bnpl",
    icon: "🛍️",
    label: "Parcelamentos",
    description: "Compre agora, pague depois",
  },
];

export function StepDebt({
  debts,
  onToggleDebt,
  onNext,
  onBack,
}: StepDebtProps) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 px-4">
        <div className="text-center mb-8">
          <div className="text-4xl mb-4">💰</div>
          <h2 className="text-2xl font-bold mb-2">
            Voce tem alguma divida atualmente?
          </h2>
          <p className="text-muted-foreground">
            Vamos criar categorias para acompanhar seus pagamentos
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl mx-auto">
          {DEBT_OPTIONS.map((option) => (
            <OnboardingCard
              key={option.value}
              icon={option.icon}
              label={option.label}
              description={option.description}
              selected={debts.includes(option.value)}
              onClick={() => onToggleDebt(option.value)}
            />
          ))}
        </div>

        <div className="text-center mt-6">
          <button
            type="button"
            onClick={onNext}
            className="text-sm text-primary hover:text-primary/80 underline underline-offset-4"
          >
            Nao tenho dividas no momento
          </button>
        </div>
      </div>

      <OnboardingFooter onNext={onNext} onBack={onBack} />
    </div>
  );
}
