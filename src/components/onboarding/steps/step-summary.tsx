"use client";

import { Badge } from "@/components/ui/badge";
import { OnboardingFooter } from "../onboarding-footer";
import { OnboardingData } from "../hooks/use-onboarding";

interface StepSummaryProps {
  data: OnboardingData;
  onSubmit: () => void;
  onBack: () => void;
  isSubmitting: boolean;
}

const CATEGORY_NAMES: Record<string, { name: string; icon: string }> = {
  // Housing
  rent: { name: "Aluguel", icon: "🏠" },
  mortgage: { name: "Financiamento", icon: "🏦" },
  owned: { name: "IPTU/Condomínio", icon: "🏠" },

  // Transport
  car: { name: "Combustível", icon: "⛽" },
  car_maintenance: { name: "Manutenção Veículo", icon: "🔧" },
  car_insurance: { name: "IPVA/Seguro", icon: "📋" },
  motorcycle: { name: "Combustível Moto", icon: "⛽" },
  public: { name: "Transporte Público", icon: "🚌" },
  apps: { name: "Uber/99", icon: "📱" },

  // Expenses Essential
  utilities: { name: "Contas de Casa", icon: "💡" },
  groceries: { name: "Mercado", icon: "🛒" },
  health: { name: "Saúde", icon: "💊" },
  education: { name: "Educação", icon: "📚" },

  // Expenses Lifestyle
  dining: { name: "Alimentação Fora", icon: "🍔" },
  clothing: { name: "Vestuário", icon: "👕" },
  streaming: { name: "Streaming", icon: "📺" },
  gym: { name: "Academia", icon: "🏋️" },
  beauty: { name: "Beleza", icon: "💇" },
  entertainment: { name: "Lazer", icon: "🎮" },

  // Debts
  credit_card_debt: { name: "Dívida Cartão", icon: "💳" },
  personal_loan: { name: "Empréstimo Pessoal", icon: "🏦" },
  car_loan: { name: "Financiamento Veículo", icon: "🚗" },
  student_loan: { name: "Empréstimo Estudantil", icon: "🎓" },
  medical: { name: "Dívida Médica", icon: "🏥" },
  bnpl: { name: "Parcelamentos", icon: "🛍️" },

  // Goals
  travel: { name: "Viagem dos Sonhos", icon: "✈️" },
  house: { name: "Casa Própria", icon: "🏠" },
  car_goal: { name: "Carro Novo", icon: "🚗" },
  wedding: { name: "Casamento", icon: "💒" },
  education_goal: { name: "Faculdade/Curso", icon: "🎓" },
  emergency: { name: "Reserva de Emergência", icon: "🛡️" },
  retirement: { name: "Aposentadoria", icon: "👴" },
};

const ACCOUNT_NAMES: Record<string, { name: string; icon: string }> = {
  checking: { name: "Conta Corrente", icon: "🏦" },
  credit_card: { name: "Cartão de Crédito", icon: "💳" },
  vr: { name: "Vale Refeição", icon: "🍽️" },
  va: { name: "Vale Alimentação", icon: "🛒" },
  cash: { name: "Dinheiro", icon: "💵" },
  investment: { name: "Investimentos", icon: "📈" },
};

function SummarySection({
  title,
  items,
}: {
  title: string;
  items: { icon: string; name: string }[];
}) {
  if (items.length === 0) return null;

  return (
    <div>
      <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">
        {title}
      </h4>
      <div className="flex flex-wrap gap-2">
        {items.map((item, index) => (
          <Badge key={index} variant="secondary" className="text-sm py-1 px-3">
            {item.icon} {item.name}
          </Badge>
        ))}
      </div>
    </div>
  );
}

export function StepSummary({
  data,
  onSubmit,
  onBack,
  isSubmitting,
}: StepSummaryProps) {
  const getMembers = () => {
    const members: { icon: string; name: string }[] = [
      { icon: "👤", name: data.displayName + " (você)" },
    ];

    if (data.household.hasPartner && data.household.partnerName) {
      members.push({ icon: "💑", name: data.household.partnerName });
    }

    data.household.children.forEach((name) => {
      if (name) members.push({ icon: "👶", name });
    });

    data.household.otherAdults.forEach((name) => {
      if (name) members.push({ icon: "👨‍👩‍👧", name });
    });

    data.household.pets.forEach((name) => {
      if (name) members.push({ icon: "🐕", name });
    });

    return members;
  };

  const getAccounts = () => {
    return data.accounts.map((acc) => ACCOUNT_NAMES[acc] || { icon: "💰", name: acc });
  };

  const getCategories = () => {
    const categories: { icon: string; name: string }[] = [];

    // Housing
    if (data.housing && data.housing !== "free") {
      const housing = CATEGORY_NAMES[data.housing];
      if (housing) categories.push(housing);
    }

    // Transport
    data.transport.forEach((t) => {
      if (t === "car") {
        categories.push(CATEGORY_NAMES.car);
        categories.push(CATEGORY_NAMES.car_maintenance);
        categories.push(CATEGORY_NAMES.car_insurance);
      } else {
        const transport = CATEGORY_NAMES[t];
        if (transport) categories.push(transport);
      }
    });

    // Expenses
    data.expenses.essential.forEach((e) => {
      const expense = CATEGORY_NAMES[e];
      if (expense) categories.push(expense);
    });

    data.expenses.lifestyle.forEach((e) => {
      const expense = CATEGORY_NAMES[e];
      if (expense) categories.push(expense);
    });

    return categories;
  };

  const getDebts = () => {
    return data.debts.map((d) => {
      const key = d === "credit_card" ? "credit_card_debt" : d;
      return CATEGORY_NAMES[key] || { icon: "💰", name: d };
    });
  };

  const getGoals = () => {
    const goals: { icon: string; name: string }[] = [];

    data.goals.forEach((g) => {
      if (g === "car") {
        goals.push(CATEGORY_NAMES.car_goal);
      } else if (g === "education") {
        goals.push(CATEGORY_NAMES.education_goal);
      } else if (g === "other" && data.customGoal) {
        goals.push({ icon: "🎯", name: data.customGoal });
      } else {
        const goal = CATEGORY_NAMES[g];
        if (goal) goals.push(goal);
      }
    });

    return goals;
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 px-4 overflow-y-auto">
        <div className="text-center mb-8">
          <div className="text-4xl mb-4">🚀</div>
          <h2 className="text-2xl font-bold mb-2">
            Tudo pronto!
          </h2>
          <p className="text-muted-foreground">
            Veja o que preparamos para você
          </p>
        </div>

        <div className="max-w-xl mx-auto space-y-6">
          <div className="rounded-lg border bg-card p-4">
            <h3 className="font-semibold mb-4">
              Orçamento de {data.displayName}
            </h3>

            <div className="space-y-4">
              <SummarySection title="Membros" items={getMembers()} />
              <SummarySection title="Contas" items={getAccounts()} />
              <SummarySection title="Categorias" items={getCategories()} />
              <SummarySection title="Dívidas" items={getDebts()} />
            </div>
          </div>

          <p className="text-sm text-muted-foreground text-center">
            Você pode adicionar ou remover itens depois nas configurações.
          </p>
        </div>
      </div>

      <OnboardingFooter
        onNext={onSubmit}
        onBack={onBack}
        nextLabel="Começar a usar o HiveBudget"
        isLoading={isSubmitting}
      />
    </div>
  );
}
