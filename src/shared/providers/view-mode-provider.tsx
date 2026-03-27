"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useCurrentPlan } from "@/shared/hooks/use-current-user";
import { usePrimaryBudget } from "@/features/budget";

export type ViewMode = "mine" | "shared" | "all";

interface ViewModeContextValue {
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  isDuoPlan: boolean;
  isUnifiedPrivacy: boolean;
  privacyMode: string | null;
  hasContributionModel: boolean;
  setHasContributionModel: (value: boolean) => void;
}

const ViewModeContext = createContext<ViewModeContextValue>({
  viewMode: "mine",
  setViewMode: () => {},
  isDuoPlan: false,
  isUnifiedPrivacy: false,
  privacyMode: null,
  hasContributionModel: true,
  setHasContributionModel: () => {},
});

const STORAGE_KEY = "hivebudget_view_mode";

export function ViewModeProvider({ children }: { children: React.ReactNode }) {
  const { currentPlan, isLoading: isPlanLoading } = useCurrentPlan();
  const { budget } = usePrimaryBudget();
  const isDuoPlan = currentPlan?.codename === "duo" || (currentPlan?.quotas?.maxBudgetMembers ?? 1) >= 2;
  const privacyMode = budget?.privacyMode ?? null;
  const isUnifiedPrivacy = privacyMode === "unified";

  // Default to true for Duo plans so the toggle shows while data loads.
  // Pages that compute the real value call setHasContributionModel to update.
  const [hasContributionModel, setHasContributionModel] = useState(true);

  const [viewMode, setViewModeState] = useState<ViewMode>("mine");

  // Load from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && (stored === "mine" || stored === "shared" || stored === "all")) {
      setViewModeState(stored);
    }
  }, []);

  // Reset to "mine" if user downgrades from Duo to Solo
  // Only run after plan data has loaded to avoid false resets
  useEffect(() => {
    if (isPlanLoading) return;
    if (!isDuoPlan && viewMode !== "mine") {
      setViewModeState("mine");
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [isDuoPlan, isPlanLoading, viewMode]);

  // Force "all" when privacy is unified (everything is shared)
  useEffect(() => {
    if (isUnifiedPrivacy && viewMode !== "all") {
      setViewModeState("all");
    }
  }, [isUnifiedPrivacy, viewMode]);

  // Force "all" when Duo plan has no contribution model (all income is shared)
  useEffect(() => {
    if (isDuoPlan && !isUnifiedPrivacy && !hasContributionModel && viewMode !== "all") {
      setViewModeState("all");
    }
  }, [isDuoPlan, isUnifiedPrivacy, hasContributionModel, viewMode]);

  const setViewMode = useCallback((mode: ViewMode) => {
    // Prevent changing view mode in unified privacy
    if (isUnifiedPrivacy) return;
    // Prevent changing view mode when there's no contribution model (everything is shared)
    if (isDuoPlan && !hasContributionModel) return;
    setViewModeState(mode);
    localStorage.setItem(STORAGE_KEY, mode);
  }, [isUnifiedPrivacy, isDuoPlan, hasContributionModel]);

  return (
    <ViewModeContext.Provider value={{
      viewMode,
      setViewMode,
      isDuoPlan,
      isUnifiedPrivacy,
      privacyMode,
      hasContributionModel,
      setHasContributionModel,
    }}>
      {children}
    </ViewModeContext.Provider>
  );
}

export function useViewMode() {
  return useContext(ViewModeContext);
}
