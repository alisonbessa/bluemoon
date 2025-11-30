"use client";

import { useState, useCallback } from "react";

export interface HouseholdData {
  hasPartner: boolean;
  partnerName: string;
  children: string[];
  otherAdults: string[];
  pets: string[];
}

export interface OnboardingData {
  displayName: string;

  household: HouseholdData;

  housing: "rent" | "mortgage" | "owned" | "free" | null;

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

  const getEffectiveSteps = useCallback(() => {
    if (needsMemberNamesStep()) {
      return STEP_ORDER;
    }
    return STEP_ORDER.filter((step) => step !== "member-names");
  }, [needsMemberNamesStep]);

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
    toggleArrayItem,
    toggleExpense,
    toggleUtilitiesDetailed,
    toggleUtilityItem,
    hasAdditionalMembers,
    submit,
  };
}
