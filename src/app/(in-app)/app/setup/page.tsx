"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Image from "next/image";
import { appConfig } from "@/shared/lib/config";
import { useCurrentUser } from "@/shared/hooks/use-current-user";
import { parseCurrency } from "@/shared/lib/formatters";
import {
  getTemplatesForPlan,
  getTemplateByCodename,
  calculatePlannedAmounts,
} from "@/shared/lib/budget-templates";
import type { TemplateCategory } from "@/shared/lib/budget-templates";
import { StepProfile } from "./_components/step-profile";
import {
  StepFinances,
  type IncomeSourceInput,
  type AccountInput,
} from "./_components/step-finances";
import { StepBudget } from "./_components/step-budget";
import { mutate } from "swr";

type CategoryWithAmount = TemplateCategory & { plannedAmount: number };

export default function SetupPage() {
  const router = useRouter();
  const { user, currentPlan } = useCurrentUser();
  const planCodename = currentPlan?.codename ?? "solo";
  const firstName = user?.name?.split(" ")[0] ?? "";
  const isDuo = planCodename === "duo";
  const templates = getTemplatesForPlan(planCodename);

  // Wizard state
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Step 1 state
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [partnerEmail, setPartnerEmail] = useState("");

  // Step 2 state
  const [incomeSources, setIncomeSources] = useState<IncomeSourceInput[]>([
    { name: "Salário", amount: "", type: "salary" },
  ]);
  const [accounts, setAccounts] = useState<AccountInput[]>([
    { name: "Conta Corrente", type: "checking" },
  ]);

  // Update default salary name when user loads
  useEffect(() => {
    if (firstName && incomeSources[0]?.name === "Salário") {
      setIncomeSources((prev) => {
        const updated = [...prev];
        updated[0] = { ...updated[0], name: `Salário - ${firstName}` };
        return updated;
      });
    }
  }, [firstName]);

  // Step 3 state
  const [budgetCategories, setBudgetCategories] = useState<
    CategoryWithAmount[]
  >([]);

  const totalIncomeCents = incomeSources.reduce(
    (sum, s) => sum + parseCurrency(s.amount),
    0
  );

  const goToStep2 = () => setStep(2);

  const goToStep3 = () => {
    // Calculate categories from template + income
    const template = getTemplateByCodename(selectedTemplate);
    if (!template) return;

    const categoriesWithAmounts = calculatePlannedAmounts(
      template,
      totalIncomeCents
    );
    setBudgetCategories(categoriesWithAmounts);
    setStep(3);
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const payload = {
        templateCodename: selectedTemplate,
        income: {
          sources: incomeSources
            .filter((s) => s.name && parseCurrency(s.amount) > 0)
            .map((s) => ({
              name: s.name,
              amount: parseCurrency(s.amount),
              type: s.type,
            })),
        },
        accounts: accounts
          .filter((a) => a.name)
          .map((a) => ({
            name: a.name,
            type: a.type,
            ...(a.type === "credit_card"
              ? { closingDay: a.closingDay, dueDay: a.dueDay }
              : {}),
          })),
        partnerEmail: isDuo && partnerEmail ? partnerEmail : undefined,
        categoryOverrides: budgetCategories.map((c) => ({
          name: c.name,
          plannedAmount: c.plannedAmount,
        })),
      };

      const response = await fetch("/api/app/onboarding/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Erro ao configurar orçamento");
      }

      // Invalidate caches
      await mutate("/api/app/me");
      await mutate("/api/app/budgets");

      toast.success("Orçamento criado com sucesso!");
      router.push("/app");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Erro ao configurar"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Step progress indicator
  const steps = [
    { number: 1, label: "Perfil" },
    { number: 2, label: "Finanças" },
    { number: 3, label: "Orçamento" },
  ];

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
          {steps.map((s, i) => (
            <div key={s.number} className="flex items-center">
              <div
                className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
                  step >= s.number
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {s.number}
              </div>
              <span
                className={`ml-1.5 text-sm hidden sm:inline ${
                  step >= s.number
                    ? "text-foreground font-medium"
                    : "text-muted-foreground"
                }`}
              >
                {s.label}
              </span>
              {i < steps.length - 1 && (
                <div
                  className={`w-8 sm:w-12 h-0.5 mx-2 ${
                    step > s.number ? "bg-primary" : "bg-muted"
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Step content */}
        {step === 1 && (
          <StepProfile
            templates={templates}
            selectedTemplate={selectedTemplate}
            onSelectTemplate={setSelectedTemplate}
            isDuo={isDuo}
            partnerEmail={partnerEmail}
            onPartnerEmailChange={setPartnerEmail}
            onNext={goToStep2}
          />
        )}

        {step === 2 && (
          <StepFinances
            incomeSources={incomeSources}
            onIncomeSourcesChange={setIncomeSources}
            accounts={accounts}
            onAccountsChange={setAccounts}
            onNext={goToStep3}
            onBack={() => setStep(1)}
          />
        )}

        {step === 3 && (
          <StepBudget
            categories={budgetCategories}
            totalIncomeCents={totalIncomeCents}
            onCategoriesChange={setBudgetCategories}
            onSubmit={handleSubmit}
            onBack={() => setStep(2)}
            isSubmitting={isSubmitting}
          />
        )}
      </div>
    </div>
  );
}
