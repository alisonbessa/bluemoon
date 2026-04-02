"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Image from "next/image";
import { appConfig } from "@/shared/lib/config";
import { useCurrentPlan } from "@/shared/hooks/use-current-user";
import type { PrivacyMode } from "@/db/schema/budgets";
import { StepPrivacy } from "./_components/step-privacy";
import { StepQuickStart } from "./_components/step-quick-start";
import { mutate } from "swr";

export default function SetupPage() {
  const router = useRouter();
  const { currentPlan } = useCurrentPlan();
  const planCodename = currentPlan?.codename ?? "solo";
  const isDuo = planCodename === "duo";

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [privacyMode, setPrivacyMode] = useState<PrivacyMode>("visible");
  const [setupComplete, setSetupComplete] = useState(false);

  const handleSubmit = async (selectedPrivacy?: PrivacyMode) => {
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/app/onboarding/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          privacyMode: selectedPrivacy || (isDuo ? privacyMode : undefined),
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Erro ao configurar orçamento");
      }

      await Promise.all([
        mutate("/api/app/me"),
        mutate("/api/app/budgets"),
        mutate("/api/app/accounts"),
        mutate("/api/app/categories"),
        mutate("/api/app/onboarding/checklist"),
      ]);

      toast.success("Orçamento criado!");

      if (isDuo) {
        setSetupComplete(true);
      } else {
        router.push("/app");
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Erro ao configurar"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Solo: submit immediately, go to dashboard
  if (!isDuo && !setupComplete) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 py-8">
        <div className="w-full max-w-lg text-center space-y-6">
          <Image
            src="/assets/logo.png"
            alt={appConfig.projectName}
            width={48}
            height={48}
            className="rounded-lg mx-auto"
          />
          <h2 className="text-2xl font-bold">Bem-vindo ao {appConfig.projectName}!</h2>
          <p className="text-muted-foreground">
            Vamos criar seu orçamento. Você poderá configurar contas, rendas e categorias pelo Dashboard.
          </p>
          <button
            onClick={() => handleSubmit()}
            disabled={isSubmitting}
            className="inline-flex items-center justify-center rounded-md bg-primary px-8 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {isSubmitting ? "Criando..." : "Começar"}
          </button>
        </div>
      </div>
    );
  }

  // Duo: Quick Start after setup
  if (setupComplete) {
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
            privacyLabel={privacyMode === "visible" ? "Tudo visível" : privacyMode === "unified" ? "Unificado" : "Privado"}
            onGoToDashboard={() => router.push("/app")}
          />
        </div>
      </div>
    );
  }

  // Duo: Privacy selection
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

        <StepPrivacy
          selectedMode={privacyMode}
          onSelectMode={setPrivacyMode}
          onNext={() => handleSubmit(privacyMode)}
        />
      </div>
    </div>
  );
}
