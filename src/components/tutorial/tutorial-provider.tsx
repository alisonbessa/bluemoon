"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  type ReactNode,
} from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  getTutorialFlow,
  getNextStep,
  getStepsByRoute,
  getStepIndex,
  type TutorialStep,
  type TutorialFlow,
} from "./tutorial-steps";

interface TutorialContextValue {
  isActive: boolean;
  isVisible: boolean; // Whether the tutorial overlay is currently showing
  currentFlow: TutorialFlow | null;
  currentStep: TutorialStep | null;
  stepIndex: number;
  totalSteps: number;
  pageStepIndex: number;
  pageStepsTotal: number;
  isLastPageStep: boolean;
  startTutorial: (flowId: string) => void;
  nextStep: () => void;
  dismissPageTutorial: () => void; // Close tutorial for current page (user will interact)
  skipTutorial: () => void;
  completeTutorial: () => void;
}

const TutorialContext = createContext<TutorialContextValue | null>(null);

const TUTORIAL_STORAGE_KEY = "hivebudget_tutorial_completed";
const TUTORIAL_PROGRESS_KEY = "hivebudget_tutorial_progress";

interface TutorialProgress {
  flowId: string;
  currentStepId: string;
  dismissedForPage: string | null; // Route where tutorial was dismissed
}

function getTutorialProgress(): TutorialProgress | null {
  if (typeof window === "undefined") return null;
  const stored = localStorage.getItem(TUTORIAL_PROGRESS_KEY);
  if (!stored) return null;
  try {
    return JSON.parse(stored);
  } catch {
    return null;
  }
}

function saveTutorialProgress(progress: TutorialProgress | null) {
  if (typeof window === "undefined") return;
  if (progress) {
    localStorage.setItem(TUTORIAL_PROGRESS_KEY, JSON.stringify(progress));
  } else {
    localStorage.removeItem(TUTORIAL_PROGRESS_KEY);
  }
}

export function TutorialProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  const [currentFlow, setCurrentFlow] = useState<TutorialFlow | null>(null);
  const [currentStep, setCurrentStep] = useState<TutorialStep | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [dismissedForPage, setDismissedForPage] = useState<string | null>(null);

  const previousPathname = useRef(pathname);

  // Initialize from localStorage on mount
  useEffect(() => {
    // Check if tutorial is already completed
    if (localStorage.getItem(TUTORIAL_STORAGE_KEY) === "true") {
      return;
    }

    const progress = getTutorialProgress();
    if (progress) {
      const flow = getTutorialFlow(progress.flowId);
      if (flow) {
        setCurrentFlow(flow);
        const step = flow.steps.find((s) => s.id === progress.currentStepId);
        if (step) {
          setCurrentStep(step);
          setDismissedForPage(progress.dismissedForPage);

          // Show tutorial if we're on the right page and not dismissed
          if (step.route === pathname && progress.dismissedForPage !== pathname) {
            setIsVisible(true);
          }
        }
      }
    }
  }, []);

  // Handle page navigation - reopen tutorial when navigating to a new tutorial page
  useEffect(() => {
    if (previousPathname.current === pathname) return;

    const prevPath = previousPathname.current;
    previousPathname.current = pathname;

    // If tutorial is active and we navigated to a new page
    if (currentFlow && currentStep) {
      // Check if the new page has tutorial steps
      const pageSteps = getStepsByRoute(currentFlow.id, pathname);

      if (pageSteps.length > 0) {
        // We have steps for this page - find the first step for this page
        const firstPageStep = pageSteps[0];
        setCurrentStep(firstPageStep);
        setDismissedForPage(null);
        setIsVisible(true);

        // Save progress
        saveTutorialProgress({
          flowId: currentFlow.id,
          currentStepId: firstPageStep.id,
          dismissedForPage: null,
        });
      } else if (dismissedForPage === prevPath) {
        // We left the dismissed page but new page has no steps
        // Keep current step but don't show
        setIsVisible(false);
      }
    }
  }, [pathname, currentFlow, currentStep, dismissedForPage]);

  const startTutorial = useCallback(
    (flowId: string) => {
      const flow = getTutorialFlow(flowId);
      if (!flow || flow.steps.length === 0) return;

      const firstStep = flow.steps[0];
      setCurrentFlow(flow);
      setCurrentStep(firstStep);
      setDismissedForPage(null);
      setIsVisible(true);

      // Save progress
      saveTutorialProgress({
        flowId,
        currentStepId: firstStep.id,
        dismissedForPage: null,
      });

      // Navigate to the first step's route
      router.push(firstStep.route);
    },
    [router]
  );

  const nextStep = useCallback(() => {
    if (!currentFlow || !currentStep) return;

    const next = getNextStep(currentFlow.id, currentStep.id);

    if (next) {
      // Check if we're transitioning to a new page
      if (next.route !== currentStep.route) {
        // This shouldn't happen normally - use dismissPageTutorial instead
        // But handle it just in case
        setCurrentStep(next);
        setDismissedForPage(null);
        setIsVisible(true);

        saveTutorialProgress({
          flowId: currentFlow.id,
          currentStepId: next.id,
          dismissedForPage: null,
        });

        router.push(next.route);
      } else {
        // Same page, just update the step
        setCurrentStep(next);

        saveTutorialProgress({
          flowId: currentFlow.id,
          currentStepId: next.id,
          dismissedForPage: dismissedForPage,
        });
      }
    } else {
      // No more steps - complete the tutorial
      completeTutorial();
    }
  }, [currentFlow, currentStep, dismissedForPage, router]);

  const dismissPageTutorial = useCallback(() => {
    if (!currentFlow || !currentStep) return;

    // Hide the tutorial overlay
    setIsVisible(false);
    setDismissedForPage(pathname);

    // Find the next page's first step to save as progress
    const next = getNextStep(currentFlow.id, currentStep.id);

    if (next && next.route !== currentStep.route) {
      // Save progress pointing to the next page's step
      saveTutorialProgress({
        flowId: currentFlow.id,
        currentStepId: next.id,
        dismissedForPage: pathname,
      });
      // Update current step to next (so when user navigates, we know where to go)
      setCurrentStep(next);
    } else if (!next) {
      // This was the last page - mark as complete when they navigate away
      saveTutorialProgress({
        flowId: currentFlow.id,
        currentStepId: currentStep.id,
        dismissedForPage: pathname,
      });
    }
  }, [currentFlow, currentStep, pathname]);

  const skipTutorial = useCallback(() => {
    localStorage.setItem(TUTORIAL_STORAGE_KEY, "true");
    saveTutorialProgress(null);
    setCurrentFlow(null);
    setCurrentStep(null);
    setIsVisible(false);
    setDismissedForPage(null);
  }, []);

  const completeTutorial = useCallback(() => {
    localStorage.setItem(TUTORIAL_STORAGE_KEY, "true");
    saveTutorialProgress(null);
    setCurrentFlow(null);
    setCurrentStep(null);
    setIsVisible(false);
    setDismissedForPage(null);
    router.push("/app");
  }, [router]);

  // Calculate indices
  const stepIndex = currentFlow && currentStep
    ? getStepIndex(currentFlow.id, currentStep.id)
    : 0;

  const pageSteps = currentFlow && currentStep
    ? getStepsByRoute(currentFlow.id, currentStep.route)
    : [];

  const pageStepIndex = currentStep
    ? pageSteps.findIndex((s) => s.id === currentStep.id)
    : 0;

  const isLastPageStep = pageStepIndex === pageSteps.length - 1;

  const value: TutorialContextValue = {
    isActive: !!currentFlow && !!currentStep,
    isVisible,
    currentFlow,
    currentStep,
    stepIndex,
    totalSteps: currentFlow?.steps.length ?? 0,
    pageStepIndex,
    pageStepsTotal: pageSteps.length,
    isLastPageStep,
    startTutorial,
    nextStep,
    dismissPageTutorial,
    skipTutorial,
    completeTutorial,
  };

  return (
    <TutorialContext.Provider value={value}>
      {children}
    </TutorialContext.Provider>
  );
}

export function useTutorial() {
  const context = useContext(TutorialContext);
  if (!context) {
    throw new Error("useTutorial must be used within a TutorialProvider");
  }
  return context;
}

export function isTutorialCompleted(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(TUTORIAL_STORAGE_KEY) === "true";
}
