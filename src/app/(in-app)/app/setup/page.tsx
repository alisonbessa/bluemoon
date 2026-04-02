"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Image from "next/image";
import { appConfig } from "@/shared/lib/config";
import { useCurrentPlan } from "@/shared/hooks/use-current-user";
import type { PrivacyMode } from "@/db/schema/budgets";
import { StepPrivacy } from "./_components/step-privacy";
import { StepFinances } from "./_components/step-finances";
import { StepQuickStart } from "./_components/step-quick-start";
import { mutate } from "swr";

const PRIVACY_LABELS: Record<PrivacyMode, string> = {
  visible: "Tudo visível",
  unified: "Unificado",
  private: "Privado",
};

export default function SetupPage() {
  const router = useRouter();
  const { currentPlan } = useCurrentPlan();
  const planCodename = currentPlan?.codename ?? "solo";
  const isDuo = planCodename === "duo";

  // Wizard state
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [setupComplete, setSetupComplete] = useState(false);

  // Privacy state (Duo only)
  const [privacyMode, setPrivacyMode] = useState<PrivacyMode>("visible");

  // Accounts state
  const [mainAccountName, setMainAccountName] = useState("");
  const [hasCreditCard, setHasCreditCard] = useState(false);
  const [creditCardName, setCreditCardName] = useState("");
  const [creditCardClosingDay, setCreditCardClosingDay] = useState<number | undefined>();
  const [creditCardDueDay, setCreditCardDueDay] = useState<number | undefined>();
  const [hasJointAccount, setHasJointAccount] = useState(false);
  const [jointAccountName, setJointAccountName] = useState("");

  // Step definitions depend on plan type
  // Solo: Contas → Quick Start
  // Duo:  Privacidade → Contas → Quick Start
  const stepDefs = isDuo
    ? [{ label: "Privacidade" }, { label: "Contas" }]
    : [{ label: "Contas" }];

  const financesStep = isDuo ? 2 : 1;
  const quickStartStep = isDuo ? 3 : 2;

  // Build API payload
  const buildPayload = () => {
    const accounts: { name: string; type: string; closingDay?: number; dueDay?: number }[] = [
      { name: mainAccountName.trim(), type: "checking" },
    ];
    if (hasCreditCard && creditCardName.trim()) {
      accounts.push({
        name: creditCardName.trim(),
        type: "credit_card",
        ...(creditCardClosingDay ? { closingDay: creditCardClosingDay } : {}),
        ...(creditCardDueDay ? { dueDay: creditCardDueDay } : {}),
      });
    }
    if (isDuo && hasJointAccount && jointAccountName.trim()) {
      accounts.push({
        name: jointAccountName.trim(),
        type: "checking" as const,
      });
    }

    return {
      templateCodename: isDuo ? "duo-default" : "solo-default",
      income: { sources: [] },
      accounts,
      privacyMode: isDuo ? privacyMode : undefined,
      categoryOverrides: [],
    };
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const payload = buildPayload();

      const response = await fetch("/api/app/onboarding/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Erro ao configurar orçamento");
      }

      // Invalidate caches after setup
      await Promise.all([
        mutate("/api/app/me"),
        mutate("/api/app/budgets"),
        mutate("/api/app/accounts"),
        mutate("/api/app/income-sources"),
        mutate("/api/app/categories"),
        mutate("/api/app/onboarding/checklist"),
      ]);

      toast.success("Orçamento criado com sucesso!");
      setSetupComplete(true);
      setStep(quickStartStep);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Erro ao configurar"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoToDashboard = () => {
    router.push("/app");
  };

  // Show Quick Start without step indicator
  if (setupComplete && step === quickStartStep) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 py-8">
        <div className="w-full max-w-lg">
          <div className="flex items-center justify-center gap-2 mb-8">
            <Image
              src="/assets/logo.png"
              alt={appConfig.projectName}
              width={32}
              height={32}
              className="rounded-lg"
            />
            <span className="text-xl font-bold">{appConfig.projectName}</span>
          </div>
          <StepQuickStart
            totalIncomeCents={0}
            categoriesCount={0}
            isDuo={isDuo}
            privacyLabel={isDuo ? PRIVACY_LABELS[privacyMode] : undefined}
            onGoToDashboard={handleGoToDashboard}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-8">
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <Image
            src="/assets/logo.png"
            alt={appConfig.projectName}
            width={32}
            height={32}
            className="rounded-lg"
          />
          <span className="text-xl font-bold">{appConfig.projectName}</span>
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {stepDefs.map((s, i) => (
            <div key={s.label} className="flex items-center">
              <div
                className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
                  step >= i + 1
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {i + 1}
              </div>
              <span
                className={`ml-1.5 text-sm hidden sm:inline ${
                  step >= i + 1
                    ? "text-foreground font-medium"
                    : "text-muted-foreground"
                }`}
              >
                {s.label}
              </span>
              {i < stepDefs.length - 1 && (
                <div
                  className={`w-8 sm:w-12 h-0.5 mx-2 ${
                    step > i + 1 ? "bg-primary" : "bg-muted"
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Step content */}
        {isDuo && step === 1 && (
          <StepPrivacy
            selectedMode={privacyMode}
            onSelectMode={setPrivacyMode}
            onNext={() => setStep(2)}
          />
        )}

        {step === financesStep && (
          <StepFinances
            isDuo={isDuo}
            mainAccountName={mainAccountName}
            onMainAccountNameChange={setMainAccountName}
            hasCreditCard={hasCreditCard}
            onHasCreditCardChange={setHasCreditCard}
            creditCardName={creditCardName}
            onCreditCardNameChange={setCreditCardName}
            creditCardClosingDay={creditCardClosingDay}
            onCreditCardClosingDayChange={setCreditCardClosingDay}
            creditCardDueDay={creditCardDueDay}
            onCreditCardDueDayChange={setCreditCardDueDay}
            hasJointAccount={hasJointAccount}
            onHasJointAccountChange={setHasJointAccount}
            jointAccountName={jointAccountName}
            onJointAccountNameChange={setJointAccountName}
            onNext={handleSubmit}
            onBack={isDuo ? () => setStep(1) : undefined}
          />
        )}
      </div>
    </div>
  );
}
