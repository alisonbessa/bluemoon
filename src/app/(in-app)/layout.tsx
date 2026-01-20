"use client";

import { AppHeader } from "@/shared/layout/app-header";
import { AppSidebar } from "@/shared/layout/app-sidebar";
import { SidebarProvider } from "@/shared/ui/sidebar";
import {
  TutorialProvider,
  TutorialOverlay,
  CelebrationModal,
  useTutorial,
} from "@/shared/tutorial";
import React, { Suspense, useEffect, useState, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useUser } from "@/shared/hooks/use-current-user";

const BUDGET_INITIALIZED_KEY = "hivebudget_budget_initialized";

function DashboardSkeleton() {
  return (
    <div className="flex flex-col h-screen">
      {/* Header Shimmer - Full Width */}
      <div className="h-14 border-b bg-background flex items-center px-4 gap-4 shrink-0">
        <div className="h-8 w-8 bg-muted rounded-lg animate-pulse" />
        <div className="h-6 w-24 bg-muted rounded animate-pulse" />
        <div className="flex-1" />
        <div className="h-6 w-6 bg-muted rounded animate-pulse md:hidden" />
      </div>

      {/* Sidebar + Content (sidebar on left for desktop) */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar Shimmer (left side) */}
        <div className="hidden md:flex w-16 flex-col border-r bg-background p-2 pt-4">
          <div className="flex flex-col gap-2">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-8 w-8 bg-muted rounded-md animate-pulse" />
            ))}
          </div>
        </div>

        {/* Content Shimmer */}
        <div className="flex-1 p-4 overflow-auto">
          <div className="max-w-7xl mx-auto flex flex-col gap-6">
            <div className="h-8 w-64 bg-muted rounded-md animate-pulse" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="p-6 rounded-lg border border-border/40 bg-card"
                >
                  <div className="flex flex-col gap-4">
                    <div className="h-4 w-24 bg-muted rounded-md animate-pulse" />
                    <div className="h-8 w-32 bg-muted rounded-md animate-pulse" />
                    <div className="h-4 w-full bg-muted rounded-md animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
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

const TUTORIAL_STARTED_KEY = "hivebudget_tutorial_started";

function AppLayoutContent({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isLoading, error, mutate } = useUser();
  const { isActive: isTutorialActive, currentStep, startTutorial } = useTutorial();

  const [showCelebration, setShowCelebration] = useState(false);
  const [celebrationSummary, setCelebrationSummary] = useState<SetupSummary | undefined>();
  const initializingRef = useRef(false);
  const tutorialStartedRef = useRef(false);

  // Auto-initialize budget for new users (creates budget, groups, categories silently)
  useEffect(() => {
    if (isLoading || !user) return;
    if (initializingRef.current) return;

    // Check if budget was already initialized
    const budgetInitialized = localStorage.getItem(BUDGET_INITIALIZED_KEY) === "true";
    if (budgetInitialized) return;

    // Check if user already has onboarding completed (existing user)
    if (user.onboardingCompletedAt) {
      localStorage.setItem(BUDGET_INITIALIZED_KEY, "true");
      return;
    }

    // Auto-create budget for new user
    const initializeBudget = async () => {
      initializingRef.current = true;
      try {
        const displayName = user?.name || user?.email?.split("@")[0] || "Usuário";

        const response = await fetch("/api/app/onboarding/welcome", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            displayName,
            household: [],
          }),
        });

        if (response.ok) {
          localStorage.setItem(BUDGET_INITIALIZED_KEY, "true");
          await mutate();

          // Auto-start tutorial for new users (only once)
          const tutorialAlreadyStarted = localStorage.getItem(TUTORIAL_STARTED_KEY) === "true";
          if (!tutorialAlreadyStarted && !tutorialStartedRef.current) {
            tutorialStartedRef.current = true;
            localStorage.setItem(TUTORIAL_STARTED_KEY, "true");
            // Small delay to ensure state is updated
            setTimeout(() => {
              startTutorial("initial-setup");
            }, 500);
          }
        }
      } catch (error) {
        console.error("Error initializing budget:", error);
      } finally {
        initializingRef.current = false;
      }
    };

    initializeBudget();
  }, [user, isLoading, mutate, startTutorial]);

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
    <SidebarProvider>
      <div className="flex flex-col h-screen w-full">
        {/* Header - Full Width at Top */}
        <AppHeader />

        {/* Sidebar + Content (sidebar on left for desktop) */}
        <div className="flex flex-1 overflow-hidden">
          <AppSidebar />
          <main className="flex-1 overflow-auto p-4 sm:p-2">
            <div className="max-w-7xl mx-auto w-full">{children}</div>
          </main>
        </div>

        {/* Celebration Modal when tutorial completes */}
        <CelebrationModal
          isOpen={showCelebration}
          onClose={handleCelebrationClose}
          summary={celebrationSummary}
        />

        {/* Tutorial Overlay (spotlight + tooltip) */}
        <TutorialOverlay />
      </div>
    </SidebarProvider>
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
