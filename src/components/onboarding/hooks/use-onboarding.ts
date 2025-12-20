"use client";

import { useState, useCallback } from "react";

export interface HouseholdData {
  hasPartner: boolean;
  partnerName: string;
  children: string[];
  otherAdults: string[];
  pets: string[];
}

export interface HousingCostsData {
  // Para ALUGUEL (housing === "rent")
  rentAmount: number; // Valor do aluguel em centavos
  rentDueDay: number; // Dia do vencimento (1-31)

  // Para FINANCIADO (housing === "mortgage")
  mortgageCurrentAmount: number; // Valor da parcela atual em centavos
  mortgageLastAmount: number; // Valor da última parcela em centavos
  mortgageRemainingMonths: number; // Quantidade de meses restantes
  mortgagePaidThisMonth: boolean; // Checkbox "Já paguei este mês"

  // Para PRÓPRIO ou FINANCIADO - IPTU
  hasIptu: boolean;
  iptuPaymentType: "single" | "installments"; // Parcela única ou parcelado
  iptuAmount: number; // Valor da parcela/total em centavos
  iptuInstallments: number; // Número de parcelas (se parcelado, geralmente 10-12)
}

export interface OnboardingData {
  displayName: string;

  household: HouseholdData;

  housing: "rent" | "mortgage" | "owned" | "free" | null;

  housingCosts: HousingCostsData;

  transport: (
    | "car"
    | "motorcycle"
    | "public"
    | "apps"
    | "bike"
    | "walk"
  )[];

  accounts: (
    | "checking"
    | "credit_card"
    | "vr"
    | "va"
    | "cash"
    | "investment"
  )[];

  expenses: {
    essential: string[];
    lifestyle: string[];
    utilitiesDetailed: boolean;
    utilitiesItems: string[];
  };

  debts: string[];

  goals: string[];
  customGoal: string;
}

const initialData: OnboardingData = {
  displayName: "",
  household: {
    hasPartner: false,
    partnerName: "",
    children: [],
    otherAdults: [],
    pets: [],
  },
  housing: null,
  housingCosts: {
    rentAmount: 0,
    rentDueDay: 10,
    mortgageCurrentAmount: 0,
    mortgageLastAmount: 0,
    mortgageRemainingMonths: 0,
    mortgagePaidThisMonth: false,
    hasIptu: false,
    iptuPaymentType: "installments",
    iptuAmount: 0,
    iptuInstallments: 10,
  },
  transport: [],
  accounts: [],
  expenses: {
    essential: [],
    lifestyle: [],
    utilitiesDetailed: false,
    utilitiesItems: [],
  },
  debts: [],
  goals: [],
  customGoal: "",
};

export type OnboardingStep =
  | "intro"
  | "welcome"
  | "household"
  | "member-names"
  | "housing"
  | "housing-costs"
  | "transport"
  | "accounts"
  | "expenses"
  | "debt"
  | "goals"
  | "summary";

const STEP_ORDER: OnboardingStep[] = [
  "intro",
  "welcome",
  "household",
  "member-names",
  "housing",
  "housing-costs",
  "transport",
  "accounts",
  "expenses",
  "debt",
  "goals",
  "summary",
];

export function useOnboarding() {
  const [data, setData] = useState<OnboardingData>(initialData);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currentStep = STEP_ORDER[currentStepIndex];

  const hasAdditionalMembers = useCallback(() => {
    const { household } = data;
    return (
      household.hasPartner ||
      household.children.length > 0 ||
      household.otherAdults.length > 0 ||
      household.pets.length > 0
    );
  }, [data]);

  const needsMemberNamesStep = useCallback(() => {
    const { household } = data;
    return (
      household.hasPartner ||
      household.children.length > 0 ||
      household.otherAdults.length > 0 ||
      household.pets.length > 0
    );
  }, [data]);

  const needsHousingCostsStep = useCallback(() => {
    // Only show housing costs step if user pays rent, mortgage, or owns (for IPTU)
    return data.housing === "rent" || data.housing === "mortgage" || data.housing === "owned";
  }, [data.housing]);

  const getEffectiveSteps = useCallback(() => {
    let steps = STEP_ORDER;

    if (!needsMemberNamesStep()) {
      steps = steps.filter((step) => step !== "member-names");
    }

    if (!needsHousingCostsStep()) {
      steps = steps.filter((step) => step !== "housing-costs");
    }

    return steps;
  }, [needsMemberNamesStep, needsHousingCostsStep]);

  const totalSteps = getEffectiveSteps().length;

  const getEffectiveStepIndex = useCallback(() => {
    const effectiveSteps = getEffectiveSteps();
    return effectiveSteps.indexOf(currentStep);
  }, [currentStep, getEffectiveSteps]);

  const goToNext = useCallback(() => {
    const effectiveSteps = getEffectiveSteps();
    const currentEffectiveIndex = effectiveSteps.indexOf(currentStep);

    if (currentEffectiveIndex < effectiveSteps.length - 1) {
      const nextStep = effectiveSteps[currentEffectiveIndex + 1];
      const nextStepIndex = STEP_ORDER.indexOf(nextStep);
      setCurrentStepIndex(nextStepIndex);
    }
  }, [currentStep, getEffectiveSteps]);

  const goToPrevious = useCallback(() => {
    const effectiveSteps = getEffectiveSteps();
    const currentEffectiveIndex = effectiveSteps.indexOf(currentStep);

    if (currentEffectiveIndex > 0) {
      const prevStep = effectiveSteps[currentEffectiveIndex - 1];
      const prevStepIndex = STEP_ORDER.indexOf(prevStep);
      setCurrentStepIndex(prevStepIndex);
    }
  }, [currentStep, getEffectiveSteps]);

  const updateData = useCallback(
    <K extends keyof OnboardingData>(
      key: K,
      value: OnboardingData[K]
    ) => {
      setData((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  const updateHousehold = useCallback(
    <K extends keyof HouseholdData>(key: K, value: HouseholdData[K]) => {
      setData((prev) => ({
        ...prev,
        household: { ...prev.household, [key]: value },
      }));
    },
    []
  );

  const updateHousingCosts = useCallback(
    <K extends keyof HousingCostsData>(key: K, value: HousingCostsData[K]) => {
      setData((prev) => ({
        ...prev,
        housingCosts: { ...prev.housingCosts, [key]: value },
      }));
    },
    []
  );

  const toggleArrayItem = useCallback(
    <K extends keyof OnboardingData>(
      key: K,
      item: string
    ) => {
      setData((prev) => {
        const array = prev[key] as string[];
        if (array.includes(item)) {
          return { ...prev, [key]: array.filter((i) => i !== item) };
        }
        return { ...prev, [key]: [...array, item] };
      });
    },
    []
  );

  const toggleExpense = useCallback(
    (type: "essential" | "lifestyle", item: string) => {
      setData((prev) => {
        const array = prev.expenses[type];
        if (array.includes(item)) {
          // If removing "utilities", also reset detailed utilities
          const additionalUpdates =
            item === "utilities"
              ? { utilitiesDetailed: false, utilitiesItems: [] }
              : {};
          return {
            ...prev,
            expenses: {
              ...prev.expenses,
              [type]: array.filter((i) => i !== item),
              ...additionalUpdates,
            },
          };
        }
        return {
          ...prev,
          expenses: {
            ...prev.expenses,
            [type]: [...array, item],
          },
        };
      });
    },
    []
  );

  const toggleUtilitiesDetailed = useCallback((detailed: boolean) => {
    setData((prev) => ({
      ...prev,
      expenses: {
        ...prev.expenses,
        utilitiesDetailed: detailed,
        // Reset items when toggling off
        utilitiesItems: detailed ? prev.expenses.utilitiesItems : [],
      },
    }));
  }, []);

  const toggleUtilityItem = useCallback((item: string) => {
    setData((prev) => {
      const items = prev.expenses.utilitiesItems;
      if (items.includes(item)) {
        return {
          ...prev,
          expenses: {
            ...prev.expenses,
            utilitiesItems: items.filter((i) => i !== item),
          },
        };
      }
      return {
        ...prev,
        expenses: {
          ...prev.expenses,
          utilitiesItems: [...items, item],
        },
      };
    });
  }, []);

  const submit = useCallback(async () => {
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/app/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Erro ao salvar onboarding");
      }

      return await response.json();
    } finally {
      setIsSubmitting(false);
    }
  }, [data]);

  return {
    data,
    currentStep,
    currentStepIndex: getEffectiveStepIndex(),
    totalSteps,
    isSubmitting,
    isFirstStep: getEffectiveStepIndex() === 0,
    isLastStep: getEffectiveStepIndex() === totalSteps - 1,
    goToNext,
    goToPrevious,
    updateData,
    updateHousehold,
    updateHousingCosts,
    toggleArrayItem,
    toggleExpense,
    toggleUtilitiesDetailed,
    toggleUtilityItem,
    hasAdditionalMembers,
    submit,
  };
}
