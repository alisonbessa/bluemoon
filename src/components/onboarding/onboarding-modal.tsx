"use client";

import { useCallback } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { OnboardingProgress } from "./onboarding-progress";
import { useOnboarding } from "./hooks/use-onboarding";
import { useTutorial } from "@/components/tutorial";
import {
  StepIntro,
  StepWelcome,
  StepHousehold,
  StepMemberNames,
  StepHousing,
  StepHousingCosts,
  StepTransport,
  StepAccounts,
  StepExpenses,
  StepDebt,
  StepGoals,
  StepSummary,
} from "./steps";

interface OnboardingModalProps {
  onComplete?: () => void;
  onSkip?: () => void;
}

export function OnboardingModal({ onComplete, onSkip }: OnboardingModalProps) {
  const router = useRouter();
  const { startTutorial } = useTutorial();
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
    updateHousingCosts,
    toggleArrayItem,
    toggleExpense,
    toggleUtilitiesDetailed,
    toggleUtilityItem,
    submit,
  } = useOnboarding();

  const handleToggleHouseholdItem = useCallback(
    (type: "children" | "otherAdults" | "pets") => {
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
      // Start the tutorial after onboarding
      startTutorial("post-onboarding");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Erro ao criar orçamento"
      );
    }
  };

  const handleSkipWithToast = useCallback(() => {
    toast.info(
      "Você pode refazer o onboarding a qualquer momento em Configurações > Refazer configuração inicial",
      { duration: 5000 }
    );
    onSkip?.();
  }, [onSkip]);

  const renderStep = () => {
    switch (currentStep) {
      case "intro":
        return (
          <StepIntro
            onNext={goToNext}
            onSkip={handleSkipWithToast}
          />
        );

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
            onToggleChildren={() => handleToggleHouseholdItem("children")}
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
            onUpdateChildren={(names) => updateHousehold("children", names)}
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

      case "housing-costs":
        return (
          <StepHousingCosts
            housing={data.housing}
            housingCosts={data.housingCosts}
            onHousingCostsChange={updateHousingCosts}
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
            onToggleUtilitiesDetailed={toggleUtilitiesDetailed}
            onToggleUtilityItem={toggleUtilityItem}
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

  const showProgress = currentStep !== "intro";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="relative flex h-[90vh] max-h-[700px] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-background shadow-2xl mx-4">
        {showProgress && (
          <div className="p-4 pb-0">
            <OnboardingProgress
              currentStep={currentStepIndex - 1}
              totalSteps={totalSteps - 1}
            />
          </div>
        )}

        <div className={`flex-1 overflow-hidden ${showProgress ? "pt-6" : ""}`}>{renderStep()}</div>
      </div>
    </div>
  );
}
