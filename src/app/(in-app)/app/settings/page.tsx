"use client";

import { useState, useEffect } from "react";
import { Button } from "@/shared/ui/button";
import { LogOut } from "lucide-react";
import { MessagingConnectionCard } from "@/integrations/messaging/MessagingConnectionCard";
import { MembersManagement } from "@/shared/settings/members-management";
import { PrivacySettings } from "@/shared/settings/privacy-settings";
import { useTutorial } from "@/shared/tutorial/tutorial-provider";
import { useRouter } from "next/navigation";
import { useCurrentUser } from "@/shared/hooks/use-current-user";
import { signOut } from "next-auth/react";
import { PageContent, PageHeader } from "@/shared/molecules";
import { ProfileCard } from "./_components/profile-card";
import { AppearanceCard } from "./_components/appearance-card";
import { PlanCard } from "./_components/plan-card";
import { SupportCard } from "./_components/support-card";
import { DataPrivacyCard } from "./_components/data-privacy-card";

export default function SettingsPage() {
  const { user, currentPlan, hasBudget, isLoading: isUserLoading, mutate: mutateUser } = useCurrentUser();
  const [budgetId, setBudgetId] = useState<string | null>(null);
  const { startTutorial, setCondition } = useTutorial();
  const router = useRouter();

  // Set tutorial condition for Duo plan
  useEffect(() => {
    if (currentPlan) {
      const isDuoPlan = (currentPlan.quotas?.maxBudgetMembers ?? 1) >= 2;
      setCondition("hasDuoPlan", isDuoPlan);
    }
  }, [currentPlan, setCondition]);

  useEffect(() => {
    const fetchBudgets = async () => {
      try {
        const response = await fetch("/api/app/budgets");
        if (response.ok) {
          const data = await response.json();
          if (data.budgets?.length > 0) {
            setBudgetId(data.budgets[0].id);
          }
        }
      } catch (error) {
        console.error("Error fetching budgets:", error);
      }
    };
    fetchBudgets();
  }, []);

  const handleStartTutorial = (id: string) => {
    startTutorial(id);
    router.push("/app/accounts");
  };

  const handleLogout = async () => {
    await signOut({ callbackUrl: "/" });
  };

  return (
    <PageContent>
      <PageHeader
        title="Configurações"
        description="Gerencie suas preferências e configurações da conta"
      />

      <div className="grid gap-6 lg:grid-cols-3 min-w-0">
        {/* Main Settings */}
        <div className="space-y-6 lg:col-span-2 min-w-0">
          <ProfileCard
            user={user}
            isUserLoading={isUserLoading}
            mutateUser={mutateUser}
          />
          <AppearanceCard />

          {/* Members Management & Privacy - Only show for Duo plans (maxBudgetMembers >= 2) */}
          {budgetId && (currentPlan?.quotas?.maxBudgetMembers ?? 1) >= 2 && (
            <>
              <MembersManagement budgetId={budgetId} />
              <PrivacySettings budgetId={budgetId} />
            </>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6 min-w-0">
          <MessagingConnectionCard />
          <PlanCard
            user={user}
            currentPlan={currentPlan}
            hasBudget={hasBudget}
            mutateUser={mutateUser}
          />
          <SupportCard
            user={user}
            startTutorial={handleStartTutorial}
          />
          <DataPrivacyCard user={user} />

          {/* Logout */}
          <Button
            variant="outline"
            className="w-full text-destructive hover:text-destructive"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4" />
            Sair da conta
          </Button>
        </div>
      </div>
    </PageContent>
  );
}
