"use client";

import { useCallback } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { OnboardingProgress } from "./onboarding-progress";
import { useOnboarding } from "./hooks/use-onboarding";
import {
  StepWelcome,
  StepHousehold,
  StepMemberNames,
  StepHousing,
  StepTransport,
  StepAccounts,
  StepExpenses,
  StepDebt,
  StepGoals,
  StepSummary,
} from "./steps";

interface OnboardingModalProps {
  onComplete?: () => void;
}

export function OnboardingModal({ onComplete }: OnboardingModalProps) {
  const router = useRouter();
  const {
    data,
    currentStep,
    currentStepIndex,
    totalSteps,
    isSubmitting,
    goToNext,
    goToPrevious,
    updateData,
    updateHousehold,
    toggleArrayItem,
    toggleExpense,
    submit,
  } = useOnboarding();

  const handleToggleHouseholdItem = useCallback(
    (type: "kids" | "teens" | "otherAdults" | "pets") => {
      const current = data.household[type];
      if (current.length > 0) {
        updateHousehold(type, []);
      } else {
        updateHousehold(type, [""]);
      }
    },
    [data.household, updateHousehold]
  );

  const handleSubmit = async () => {
    try {
      await submit();
      toast.success("Orçamento criado com sucesso!");
      onComplete?.();
      router.push("/app/accounts/setup");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Erro ao criar orçamento"
      );
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case "welcome":
        return (
          <StepWelcome
            displayName={data.displayName}
            onDisplayNameChange={(value) => updateData("displayName", value)}
            onNext={goToNext}
          />
        );

      case "household":
        return (
          <StepHousehold
            household={data.household}
            onTogglePartner={() =>
              updateHousehold("hasPartner", !data.household.hasPartner)
            }
            onToggleKids={() => handleToggleHouseholdItem("kids")}
            onToggleTeens={() => handleToggleHouseholdItem("teens")}
            onToggleOtherAdults={() => handleToggleHouseholdItem("otherAdults")}
            onTogglePets={() => handleToggleHouseholdItem("pets")}
            onNext={goToNext}
            onBack={goToPrevious}
          />
        );

      case "member-names":
        return (
          <StepMemberNames
            household={data.household}
            onUpdatePartnerName={(name) => updateHousehold("partnerName", name)}
            onUpdateKids={(names) => updateHousehold("kids", names)}
            onUpdateTeens={(names) => updateHousehold("teens", names)}
            onUpdateOtherAdults={(names) =>
              updateHousehold("otherAdults", names)
            }
            onUpdatePets={(names) => updateHousehold("pets", names)}
            onNext={goToNext}
            onBack={goToPrevious}
          />
        );

      case "housing":
        return (
          <StepHousing
            housing={data.housing}
            onHousingChange={(value) => updateData("housing", value)}
            onNext={goToNext}
            onBack={goToPrevious}
          />
        );

      case "transport":
        return (
          <StepTransport
            transport={data.transport}
            onToggleTransport={(value) => toggleArrayItem("transport", value)}
            onNext={goToNext}
            onBack={goToPrevious}
          />
        );

      case "accounts":
        return (
          <StepAccounts
            accounts={data.accounts}
            onToggleAccount={(value) => toggleArrayItem("accounts", value)}
            onNext={goToNext}
            onBack={goToPrevious}
          />
        );

      case "expenses":
        return (
          <StepExpenses
            expenses={data.expenses}
            onToggleExpense={toggleExpense}
            onNext={goToNext}
            onBack={goToPrevious}
          />
        );

      case "debt":
        return (
          <StepDebt
            debts={data.debts}
            onToggleDebt={(value) => toggleArrayItem("debts", value)}
            onNext={goToNext}
            onBack={goToPrevious}
          />
        );

      case "goals":
        return (
          <StepGoals
            goals={data.goals}
            customGoal={data.customGoal}
            onToggleGoal={(value) => toggleArrayItem("goals", value)}
            onCustomGoalChange={(value) => updateData("customGoal", value)}
            onNext={goToNext}
            onBack={goToPrevious}
          />
        );

      case "summary":
        return (
          <StepSummary
            data={data}
            onSubmit={handleSubmit}
            onBack={goToPrevious}
            isSubmitting={isSubmitting}
          />
        );

      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="relative flex h-[90vh] max-h-[700px] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-background shadow-2xl mx-4">
        <div className="p-4 pb-0">
          <OnboardingProgress
            currentStep={currentStepIndex}
            totalSteps={totalSteps}
          />
        </div>

        <div className="flex-1 overflow-hidden py-6">{renderStep()}</div>
      </div>
    </div>
  );
}
