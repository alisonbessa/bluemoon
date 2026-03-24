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
}

const ViewModeContext = createContext<ViewModeContextValue>({
  viewMode: "mine",
  setViewMode: () => {},
  isDuoPlan: false,
  isUnifiedPrivacy: false,
});

const STORAGE_KEY = "hivebudget_view_mode";

export function ViewModeProvider({ children }: { children: React.ReactNode }) {
  const { currentPlan } = useCurrentPlan();
  const { budget } = usePrimaryBudget();
  const isDuoPlan = currentPlan?.codename === "duo" || (currentPlan?.quotas?.maxBudgetMembers ?? 1) >= 2;
  const isUnifiedPrivacy = budget?.privacyMode === "unified";

  const [viewMode, setViewModeState] = useState<ViewMode>("mine");

  // Load from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && (stored === "mine" || stored === "shared" || stored === "all")) {
      setViewModeState(stored);
    }
  }, []);

  // Reset to "mine" if user downgrades from Duo to Solo
  useEffect(() => {
    if (!isDuoPlan && viewMode !== "mine") {
      setViewModeState("mine");
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [isDuoPlan, viewMode]);

  // Force "all" when privacy is unified (everything is shared)
  useEffect(() => {
    if (isUnifiedPrivacy && viewMode !== "all") {
      setViewModeState("all");
    }
  }, [isUnifiedPrivacy, viewMode]);

  const setViewMode = useCallback((mode: ViewMode) => {
    // Prevent changing view mode in unified privacy
    if (isUnifiedPrivacy) return;
    setViewModeState(mode);
    localStorage.setItem(STORAGE_KEY, mode);
  }, [isUnifiedPrivacy]);

  return (
    <ViewModeContext.Provider value={{ viewMode, setViewMode, isDuoPlan, isUnifiedPrivacy }}>
      {children}
    </ViewModeContext.Provider>
  );
}

export function useViewMode() {
  return useContext(ViewModeContext);
}
