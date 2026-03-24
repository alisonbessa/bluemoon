"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import { LogOut, Users, ArrowRight } from "lucide-react";
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
  const { user, currentPlan, hasBudget, primaryBudgetId, isLoading: isUserLoading, mutate: mutateUser } = useCurrentUser();
  const budgetId = primaryBudgetId;
  const { startTutorial, setCondition } = useTutorial();
  const router = useRouter();
  const isDuo = currentPlan?.codename === "duo" || (currentPlan?.quotas?.maxBudgetMembers ?? 1) >= 2;

  // Set tutorial condition for Duo plan
  useEffect(() => {
    if (currentPlan) {
      setCondition("hasDuoPlan", isDuo);
    }
  }, [currentPlan, setCondition, isDuo]);

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

          {/* Members Management & Privacy - Only show for Duo plans */}
          {isDuo && (
            budgetId ? (
              <>
                <MembersManagement budgetId={budgetId} />
                <PrivacySettings budgetId={budgetId} />
              </>
            ) : (
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-muted-foreground" />
                    <CardTitle className="text-lg">Membros</CardTitle>
                  </div>
                  <CardDescription>
                    Complete a configuracao inicial para convidar seu parceiro(a) e gerenciar membros.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button asChild>
                    <Link href="/app/setup">
                      Completar configuracao
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            )
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6 min-w-0">
          <MessagingConnectionCard />
          <PlanCard
            user={user}
            currentPlan={currentPlan ?? null}
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
