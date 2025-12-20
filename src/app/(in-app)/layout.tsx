"use client";

import { AppHeader } from "@/components/layout/app-header";
import { TutorialProvider, TutorialOverlay } from "@/components/tutorial";
import React, { Suspense, useEffect } from "react";
import { useRouter } from "next/navigation";
import useUser from "@/lib/users/useUser";
import dynamic from "next/dynamic";

// PERFORMANCE: Lazy load OnboardingModal since it's only shown once per user
const OnboardingModal = dynamic(
  () => import("@/components/onboarding").then((mod) => mod.OnboardingModal),
  { ssr: false }
);

function DashboardSkeleton() {
  return (
    <div className="flex flex-col h-screen">
      {/* Header Shimmer */}
      <div className="border-b border-border/40 bg-background">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-4">
            {/* Logo/Brand shimmer */}
            <div className="h-8 w-32 bg-gray-200 rounded-md animate-pulse" />
            {/* Navigation items shimmer */}
            <div className="hidden md:flex gap-4">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-4 w-20 bg-gray-200 rounded-md animate-pulse"
                />
              ))}
            </div>
          </div>
          {/* User menu shimmer */}
          <div className="flex items-center gap-4">
            <div className="h-8 w-8 bg-gray-200 rounded-full animate-pulse" />
            <div className="h-4 w-24 bg-gray-200 rounded-md animate-pulse" />
          </div>
        </div>
      </div>

      {/* Content Shimmer */}
      <div className="grow p-4">
        <div className="max-w-7xl mx-auto flex flex-col gap-6">
          {/* Page title shimmer */}
          <div className="h-8 w-64 bg-gray-200 rounded-md animate-pulse" />

          {/* Content blocks shimmer */}
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

function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, isLoading, error, mutate } = useUser();

  const hasSkippedOnboarding = typeof window !== "undefined" && localStorage.getItem("onboarding-skipped") === "true";
  const showOnboarding = !isLoading && user && !user.onboardingCompletedAt && !hasSkippedOnboarding;

  const handleOnboardingComplete = () => {
    mutate();
  };

  const handleOnboardingSkip = () => {
    // Save to localStorage that user skipped onboarding
    localStorage.setItem("onboarding-skipped", "true");
    // Mutate to refresh user state (modal will close since we set the skip flag)
    mutate();
  };

  // Redirect to home if user is not authenticated, session expired, or error occurred
  useEffect(() => {
    if (!isLoading && (!user || error)) {
      router.replace("/");
    }
  }, [isLoading, user, error, router]);

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  // Show skeleton while redirecting (user not authenticated or error)
  if (!user || error) {
    return <DashboardSkeleton />;
  }

  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <TutorialProvider>
        <div className="flex flex-col h-screen gap-4">
          <AppHeader />
          <div className="grow p-4 sm:p-2 max-w-7xl mx-auto w-full">{children}</div>

          {showOnboarding && (
            <OnboardingModal
              onComplete={handleOnboardingComplete}
              onSkip={handleOnboardingSkip}
            />
          )}

          <TutorialOverlay />
        </div>
      </TutorialProvider>
    </Suspense>
  );
}

export default AppLayout;
