"use client";

import { OnboardingCard } from "../onboarding-card";
import { OnboardingFooter } from "../onboarding-footer";

interface StepExpensesProps {
  expenses: {
    essential: string[];
    lifestyle: string[];
  };
  onToggleExpense: (type: "essential" | "lifestyle", value: string) => void;
  onNext: () => void;
  onBack: () => void;
}

const ESSENTIAL_OPTIONS = [
  {
    value: "utilities",
    icon: "💡",
    label: "Contas de casa",
    description: "Luz, agua, gas, internet",
  },
  {
    value: "groceries",
    icon: "🛒",
    label: "Mercado/Supermercado",
    description: "Compras de casa",
  },
  {
    value: "health",
    icon: "💊",
    label: "Saude",
    description: "Plano, remedios, consultas",
  },
  {
    value: "education",
    icon: "📚",
    label: "Educacao",
    description: "Escola, cursos, materiais",
  },
];

const LIFESTYLE_OPTIONS = [
  {
    value: "dining",
    icon: "🍔",
    label: "Alimentacao fora",
    description: "Restaurantes, delivery",
  },
  {
    value: "clothing",
    icon: "👕",
    label: "Vestuario",
    description: "Roupas e calcados",
  },
  {
    value: "streaming",
    icon: "📺",
    label: "Streaming",
    description: "Netflix, Spotify, etc",
  },
  {
    value: "gym",
    icon: "🏋️",
    label: "Academia/Esportes",
    description: "Mensalidades e equipamentos",
  },
  {
    value: "beauty",
    icon: "💇",
    label: "Beleza e cuidados",
    description: "Cabelo, estetica, etc",
  },
  {
    value: "entertainment",
    icon: "🎮",
    label: "Lazer e entretenimento",
    description: "Cinema, jogos, hobbies",
  },
];

export function StepExpenses({
  expenses,
  onToggleExpense,
  onNext,
  onBack,
}: StepExpensesProps) {
  const hasAnyExpense =
    expenses.essential.length > 0 || expenses.lifestyle.length > 0;

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 px-4 overflow-y-auto">
        <div className="text-center mb-8">
          <div className="text-4xl mb-4">🛒</div>
          <h2 className="text-2xl font-bold mb-2">
            Quais despesas voce tem regularmente?
          </h2>
          <p className="text-muted-foreground">
            Selecione as categorias que fazem sentido para voce
          </p>
        </div>

        <div className="max-w-xl mx-auto space-y-8">
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Essencial
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {ESSENTIAL_OPTIONS.map((option) => (
                <OnboardingCard
                  key={option.value}
                  icon={option.icon}
                  label={option.label}
                  description={option.description}
                  selected={expenses.essential.includes(option.value)}
                  onClick={() => onToggleExpense("essential", option.value)}
                />
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Estilo de Vida
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {LIFESTYLE_OPTIONS.map((option) => (
                <OnboardingCard
                  key={option.value}
                  icon={option.icon}
                  label={option.label}
                  description={option.description}
                  selected={expenses.lifestyle.includes(option.value)}
                  onClick={() => onToggleExpense("lifestyle", option.value)}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      <OnboardingFooter
        onNext={onNext}
        onBack={onBack}
        nextDisabled={!hasAnyExpense}
      />
    </div>
  );
}
