"use client";

import { OnboardingCard } from "../onboarding-card";
import { OnboardingFooter } from "../onboarding-footer";

type AccountType =
  | "checking"
  | "credit_card"
  | "vr"
  | "va"
  | "cash"
  | "investment";

interface StepAccountsProps {
  accounts: AccountType[];
  onToggleAccount: (value: AccountType) => void;
  onNext: () => void;
  onBack: () => void;
}

const ACCOUNT_OPTIONS: {
  value: AccountType;
  icon: string;
  label: string;
  description: string;
}[] = [
  {
    value: "checking",
    icon: "🏦",
    label: "Conta corrente",
    description: "Banco tradicional ou digital",
  },
  {
    value: "credit_card",
    icon: "💳",
    label: "Cartao de credito",
    description: "Visa, Mastercard, etc",
  },
  {
    value: "vr",
    icon: "🍽️",
    label: "Vale Refeicao (VR)",
    description: "Para restaurantes",
  },
  {
    value: "va",
    icon: "🛒",
    label: "Vale Alimentacao (VA)",
    description: "Para supermercados",
  },
  {
    value: "cash",
    icon: "💵",
    label: "Dinheiro em especie",
    description: "Dinheiro fisico",
  },
  {
    value: "investment",
    icon: "📈",
    label: "Conta investimento",
    description: "Corretora ou banco",
  },
];

export function StepAccounts({
  accounts,
  onToggleAccount,
  onNext,
  onBack,
}: StepAccountsProps) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 px-4">
        <div className="text-center mb-8">
          <div className="text-4xl mb-4">💳</div>
          <h2 className="text-2xl font-bold mb-2">
            Quais contas e cartoes voce usa?
          </h2>
          <p className="text-muted-foreground">
            Vamos criar essas contas para voce. Os valores voce define depois.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl mx-auto">
          {ACCOUNT_OPTIONS.map((option) => (
            <OnboardingCard
              key={option.value}
              icon={option.icon}
              label={option.label}
              description={option.description}
              selected={accounts.includes(option.value)}
              onClick={() => onToggleAccount(option.value)}
            />
          ))}
        </div>
      </div>

      <OnboardingFooter
        onNext={onNext}
        onBack={onBack}
        nextDisabled={accounts.length === 0}
      />
    </div>
  );
}
