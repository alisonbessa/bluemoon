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
import { ViewModeProvider } from "@/shared/providers/view-mode-provider";
import { FloatingChatbot } from "@/shared/components/floating-chatbot";
import React, { Suspense, useEffect, useState, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useCurrentUser, useCurrentPlan } from "@/shared/hooks/use-current-user";
import { useSubscriptionGate } from "@/shared/hooks/use-subscription-gate";
import { SubscriptionExpiredBanner } from "@/shared/layout/subscription-expired-banner";
import { mutate as swrMutate } from "swr";
import { SUBSCRIPTION_EXEMPT_ROLES, SUBSCRIPTION_EXEMPT_PATHS } from "@/shared/lib/constants";

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
  const { user, hasPartnerAccess, hasBudget, isLoading, error, mutate } = useCurrentUser();
  const { currentPlan } = useCurrentPlan();
  const { isReadOnly, status: subscriptionStatus } = useSubscriptionGate();
  const { isActive: isTutorialActive, currentStep, startTutorial, nextStep, completeTutorial, setCondition } = useTutorial();

  const [showCelebration, setShowCelebration] = useState(false);
  const [celebrationSummary, setCelebrationSummary] = useState<SetupSummary | undefined>();
  const initializingRef = useRef(false);
  const tutorialStartedRef = useRef(false);

  // Set tutorial conditions based on user plan
  useEffect(() => {
    if (currentPlan) {
      const isDuoPlan = currentPlan.codename === "duo" || (currentPlan.quotas?.maxBudgetMembers ?? 1) >= 2;
      setCondition("hasDuoPlan", isDuoPlan);
    }
  }, [currentPlan, setCondition]);

  // Redirect new users who haven't completed onboarding to the setup wizard
  useEffect(() => {
    if (isLoading || !user) return;

    // Skip if already on setup or exempt paths
    if (pathname?.startsWith("/app/setup") || pathname?.startsWith("/app/choose-plan")) return;

    // Only redirect users who have full access
    const hasActiveSubscription = user.stripeSubscriptionId !== null;
    const hasExemptRole = user.role && SUBSCRIPTION_EXEMPT_ROLES.includes(user.role);
    if (!hasActiveSubscription && !hasExemptRole && !hasPartnerAccess) return;

    // If onboarding is done, mark as initialized
    if (user.onboardingCompletedAt) {
      localStorage.setItem(BUDGET_INITIALIZED_KEY, "true");

      // Partners who haven't completed onboarding get a welcome page
      if (hasPartnerAccess && !pathname?.startsWith("/app/partner-welcome")) {
        const partnerWelcomeDone = localStorage.getItem("hivebudget_partner_welcome_done") === "true";
        if (!partnerWelcomeDone) {
          router.replace("/app/partner-welcome");
          return;
        }
      }

      return;
    }

    // Onboarding not completed — redirect to setup wizard
    router.replace("/app/setup");
  }, [user, isLoading, hasPartnerAccess, pathname, router]);

  // Detect when tutorial reaches the celebration step (after partner invite, before messaging)
  useEffect(() => {
    if (isTutorialActive && currentStep?.id === "setup-celebration" && pathname === "/app") {
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
    // User chose "Fazer depois" — complete the tutorial
    completeTutorial();
  };

  const handleConnectMessaging = async () => {
    setShowCelebration(false);
    completeTutorial();

    // Fetch WhatsApp connect link and open directly
    try {
      const res = await fetch("/api/whatsapp/connect-link");
      if (res.ok) {
        const data = await res.json();
        if (data.code && data.whatsappNumber) {
          const message = encodeURIComponent(`Olá! Meu código para o HiveBudget é: ${data.code}`);
          window.open(`https://wa.me/${data.whatsappNumber}?text=${message}`, "_blank");
        } else {
          // Fallback: go to settings page
          router.push("/app/settings");
        }
      }
    } catch {
      router.push("/app/settings");
    }
  };

  // Redirect to home if user is not authenticated
  useEffect(() => {
    if (!isLoading && (!user || error)) {
      router.replace("/");
    }
  }, [isLoading, user, error, router]);

  // Redirect NEW users (never had a budget) to choose-plan.
  // RETURNING users (have a budget but cancelled subscription) get read-only access.
  useEffect(() => {
    if (isLoading || !user) return;

    // Skip check for exempt paths (choose-plan, settings, subscribe)
    if (SUBSCRIPTION_EXEMPT_PATHS.some((path) => pathname?.startsWith(path))) {
      return;
    }

    // Redirect users who need to choose a plan:
    // - "none": new user, never had a subscription
    // - "needs_plan": beta user who hasn't chosen Solo/Duo yet
    if (subscriptionStatus === "none" || subscriptionStatus === "needs_plan") {
      router.replace("/app/choose-plan");
    }
  }, [isLoading, user, subscriptionStatus, pathname, router]);

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  if (!user || error) {
    return <DashboardSkeleton />;
  }

  // Check if user has an active subscription or exempt role
  const hasActiveSubscription = user.stripeSubscriptionId !== null;
  const hasExemptRole = user.role && SUBSCRIPTION_EXEMPT_ROLES.includes(user.role);
  const isOnSetupPage = pathname?.startsWith("/app/setup");
  const isOnChoosePlanPage = pathname === "/app/choose-plan";

  // Prevent flicker: show skeleton while redirecting to setup
  const needsOnboarding = !user.onboardingCompletedAt
    && (hasActiveSubscription || hasExemptRole || hasPartnerAccess)
    && !isOnSetupPage && !isOnChoosePlanPage;
  if (needsOnboarding) {
    return <DashboardSkeleton />;
  }

  // Show minimal layout for choose-plan page when user doesn't have a subscription
  // Partners with access through owner's subscription can use full layout
  if (isOnChoosePlanPage && !hasActiveSubscription && !hasExemptRole && !hasPartnerAccess) {
    return (
      <div className="min-h-screen bg-background">
        <main className="flex-1">
          {children}
        </main>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="flex flex-col h-screen w-full">
        {/* Header - Full Width at Top */}
        <AppHeader />

        {/* Subscription expired banner for returning users */}
        {subscriptionStatus === "expired" && <SubscriptionExpiredBanner />}

        {/* Sidebar + Content (sidebar on left for desktop) */}
        <div className="flex flex-1 overflow-hidden">
          <AppSidebar />
          <main className={`flex-1 overflow-auto ${isReadOnly ? "pointer-events-auto" : ""}`}>
            <div className="max-w-7xl mx-auto w-full">{children}</div>
          </main>
        </div>

        {/* Floating Chatbot */}
        <FloatingChatbot />

        {/* Celebration Modal when tutorial completes */}
        <CelebrationModal
          isOpen={showCelebration}
          onClose={handleCelebrationClose}
          onConnectMessaging={handleConnectMessaging}
          summary={celebrationSummary}
        />

        {/* Tutorial Overlay (spotlight + tooltip) - hidden during celebration */}
        {!showCelebration && <TutorialOverlay />}
      </div>
    </SidebarProvider>
  );
}

function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <TutorialProvider>
        <ViewModeProvider>
          <AppLayoutContent>{children}</AppLayoutContent>
        </ViewModeProvider>
      </TutorialProvider>
    </Suspense>
  );
}

export default AppLayout;
