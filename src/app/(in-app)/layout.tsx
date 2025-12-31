"use client";

import { AppHeader } from "@/components/layout/app-header";
import {
  TutorialProvider,
  TutorialOverlay,
  WelcomeModal,
  CelebrationModal,
  useTutorial,
  isTutorialCompleted,
} from "@/components/tutorial";
import React, { Suspense, useEffect, useState, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import useUser from "@/lib/users/useUser";
import { toast } from "sonner";

const TUTORIAL_STORAGE_KEY = "hivebudget_tutorial_completed";
const WELCOME_COMPLETED_KEY = "hivebudget_welcome_completed";

function DashboardSkeleton() {
  return (
    <div className="flex flex-col h-screen">
      {/* Header Shimmer */}
      <div className="border-b border-border/40 bg-background">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-4">
            <div className="h-8 w-32 bg-gray-200 rounded-md animate-pulse" />
            <div className="hidden md:flex gap-4">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-4 w-20 bg-gray-200 rounded-md animate-pulse"
                />
              ))}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="h-8 w-8 bg-gray-200 rounded-full animate-pulse" />
            <div className="h-4 w-24 bg-gray-200 rounded-md animate-pulse" />
          </div>
        </div>
      </div>

      {/* Content Shimmer */}
      <div className="grow p-4">
        <div className="max-w-7xl mx-auto flex flex-col gap-6">
          <div className="h-8 w-64 bg-gray-200 rounded-md animate-pulse" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="p-6 rounded-lg border border-border/40 bg-card"
              >
                <div className="flex flex-col gap-4">
                  <div className="h-4 w-24 bg-gray-200 rounded-md animate-pulse" />
                  <div className="h-8 w-32 bg-gray-200 rounded-md animate-pulse" />
                  <div className="h-4 w-full bg-gray-200 rounded-md animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

interface SetupSummary {
  accountsCount: number;
  incomeSourcesCount: number;
  categoriesCount: number;
  goalsCount: number;
  totalMonthlyIncome: number;
}

interface WelcomeData {
  displayName: string;
  household: Array<{
    type: "partner" | "child" | "adult" | "pet";
    count: number;
  }>;
}

function AppLayoutContent({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isLoading, error, mutate } = useUser();
  const { startTutorial, isActive: isTutorialActive, currentStep } = useTutorial();

  const [showWelcome, setShowWelcome] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [celebrationSummary, setCelebrationSummary] = useState<SetupSummary | undefined>();

  // Check if user needs onboarding (new user, never completed tutorial)
  useEffect(() => {
    if (isLoading || !user) return;

    // Don't show welcome if tutorial is already active (user is in the middle of it)
    if (isTutorialActive) return;

    // Check if welcome was already completed
    const welcomeCompleted = localStorage.getItem(WELCOME_COMPLETED_KEY) === "true";
    const tutorialCompleted = isTutorialCompleted();

    // Show welcome if user hasn't completed onboarding and hasn't seen welcome yet
    if (!user.onboardingCompletedAt && !welcomeCompleted && !tutorialCompleted) {
      setShowWelcome(true);
    }
  }, [user, isLoading, isTutorialActive]);

  // Detect when tutorial reaches the final step
  useEffect(() => {
    if (isTutorialActive && currentStep?.id === "setup-complete" && pathname === "/app") {
      // Fetch summary data and show celebration
      fetchSetupSummary();
    }
  }, [isTutorialActive, currentStep, pathname]);

  const fetchSetupSummary = async () => {
    try {
      const [accountsRes, incomeRes, categoriesRes, goalsRes] = await Promise.all([
        fetch("/api/app/accounts"),
        fetch("/api/app/income-sources"),
        fetch("/api/app/categories"),
        fetch("/api/app/goals"),
      ]);

      const accountsData = accountsRes.ok ? await accountsRes.json() : { accounts: [] };
      const incomeData = incomeRes.ok ? await incomeRes.json() : { incomeSources: [], totalMonthlyIncome: 0 };
      const categoriesData = categoriesRes.ok ? await categoriesRes.json() : { groups: [] };
      const goalsData = goalsRes.ok ? await goalsRes.json() : { goals: [] };

      const totalCategories = categoriesData.groups?.reduce(
        (sum: number, g: { categories: unknown[] }) => sum + (g.categories?.length || 0),
        0
      ) || 0;

      setCelebrationSummary({
        accountsCount: accountsData.accounts?.length || 0,
        incomeSourcesCount: incomeData.incomeSources?.length || 0,
        categoriesCount: totalCategories,
        goalsCount: goalsData.goals?.filter((g: { isCompleted: boolean }) => !g.isCompleted)?.length || 0,
        totalMonthlyIncome: incomeData.totalMonthlyIncome || 0,
      });

      setShowCelebration(true);
    } catch (error) {
      console.error("Error fetching setup summary:", error);
    }
  };

  const handleWelcomeComplete = async (data: WelcomeData) => {
    try {
      // Save user display name and create initial budget/members
      const response = await fetch("/api/app/onboarding/welcome", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error("Erro ao salvar dados");
      }

      // Mark welcome as completed
      localStorage.setItem(WELCOME_COMPLETED_KEY, "true");
      setShowWelcome(false);

      // Refresh user data
      await mutate();

      // Start the tutorial
      startTutorial("initial-setup");
    } catch (error) {
      console.error("Error completing welcome:", error);
      toast.error("Erro ao salvar. Tente novamente.");
      throw error;
    }
  };

  const handleWelcomeSkip = () => {
    // Mark as completed so user doesn't see it again
    localStorage.setItem(WELCOME_COMPLETED_KEY, "true");
    localStorage.setItem(TUTORIAL_STORAGE_KEY, "true");
    setShowWelcome(false);
    toast.info("Você pode acessar o tutorial nas configurações a qualquer momento.");
  };

  const handleCelebrationClose = () => {
    setShowCelebration(false);
    // Ensure user stays on dashboard
    if (pathname !== "/app") {
      router.push("/app");
    }
  };

  // Redirect to home if user is not authenticated
  useEffect(() => {
    if (!isLoading && (!user || error)) {
      router.replace("/");
    }
  }, [isLoading, user, error, router]);

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  if (!user || error) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="flex flex-col h-screen gap-4">
      <AppHeader />
      <div className="grow p-4 sm:p-2 max-w-7xl mx-auto w-full">{children}</div>

      {/* Welcome Modal for new users */}
      <WelcomeModal
        isOpen={showWelcome}
        onComplete={handleWelcomeComplete}
        onSkip={handleWelcomeSkip}
      />

      {/* Celebration Modal when tutorial completes */}
      <CelebrationModal
        isOpen={showCelebration}
        onClose={handleCelebrationClose}
        summary={celebrationSummary}
      />

      {/* Tutorial Overlay (spotlight + tooltip) */}
      <TutorialOverlay />
    </div>
  );
}

function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <TutorialProvider>
        <AppLayoutContent>{children}</AppLayoutContent>
      </TutorialProvider>
    </Suspense>
  );
}

export default AppLayout;
