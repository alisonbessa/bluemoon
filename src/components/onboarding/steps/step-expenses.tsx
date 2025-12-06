"use client";

import { OnboardingCard } from "../onboarding-card";
import { OnboardingFooter } from "../onboarding-footer";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface StepExpensesProps {
  expenses: {
    essential: string[];
    lifestyle: string[];
    utilitiesDetailed: boolean;
    utilitiesItems: string[];
  };
  onToggleExpense: (type: "essential" | "lifestyle", value: string) => void;
  onToggleUtilitiesDetailed: (detailed: boolean) => void;
  onToggleUtilityItem: (item: string) => void;
  onNext: () => void;
  onBack: () => void;
}

const ESSENTIAL_OPTIONS = [
  {
    value: "utilities",
    icon: "💡",
    label: "Contas de casa",
    description: "Luz, água, gás, internet",
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
    label: "Saúde",
    description: "Plano, remédios, consultas",
  },
  {
    value: "education",
    icon: "📚",
    label: "Educação",
    description: "Escola, cursos, materiais",
  },
];

const UTILITY_ITEMS = [
  { value: "electricity", icon: "⚡", label: "Energia" },
  { value: "water", icon: "💧", label: "Água" },
  { value: "gas", icon: "🔥", label: "Gás" },
  { value: "internet", icon: "🌐", label: "Internet" },
  { value: "phone", icon: "📱", label: "Telefone" },
  { value: "condominium", icon: "🏢", label: "Condomínio" },
  { value: "iptu", icon: "🏠", label: "IPTU" },
];

const LIFESTYLE_OPTIONS = [
  {
    value: "dining",
    icon: "🍔",
    label: "Alimentação fora",
    description: "Restaurantes, delivery",
  },
  {
    value: "clothing",
    icon: "👕",
    label: "Vestuário",
    description: "Roupas e calçados",
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
    description: "Cabelo, estética, etc",
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
  onToggleUtilitiesDetailed,
  onToggleUtilityItem,
  onNext,
  onBack,
}: StepExpensesProps) {
  const hasAnyExpense =
    expenses.essential.length > 0 || expenses.lifestyle.length > 0;
  const hasUtilities = expenses.essential.includes("utilities");
  const showUtilitiesDetail = hasUtilities && expenses.utilitiesDetailed;

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 px-4 overflow-y-auto">
        <div className="text-center mb-8">
          <div className="text-4xl mb-4">🛒</div>
          <h2 className="text-2xl font-bold mb-2">
            Quais despesas você tem regularmente?
          </h2>
          <p className="text-muted-foreground">
            Selecione as categorias que fazem sentido para você
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

            {hasUtilities && (
              <div className="mt-4 p-4 rounded-lg border bg-muted/30">
                <div className="flex items-center justify-between mb-3">
                  <Label htmlFor="utilities-detailed" className="text-sm font-medium">
                    Detalhar contas de casa?
                  </Label>
                  <Switch
                    id="utilities-detailed"
                    checked={expenses.utilitiesDetailed}
                    onCheckedChange={onToggleUtilitiesDetailed}
                  />
                </div>
                <p className="text-xs text-muted-foreground mb-3">
                  Controle cada conta separadamente para ter mais visibilidade
                </p>

                {showUtilitiesDetail && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {UTILITY_ITEMS.map((item) => (
                      <button
                        key={item.value}
                        type="button"
                        onClick={() => onToggleUtilityItem(item.value)}
                        className={`flex items-center gap-2 p-2 rounded-md border text-sm transition-colors ${
                          expenses.utilitiesItems.includes(item.value)
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border hover:border-primary/50"
                        }`}
                      >
                        <span>{item.icon}</span>
                        <span>{item.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
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
