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

// Validation keys that can be triggered when user completes actions
export type TutorialValidationKey =
  | "hasAccounts"
  | "hasIncome"
  | "hasAllocations"
  | "hasGoals";

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
  isWaitingForAction: boolean; // Whether we're waiting for user to complete an action
  startTutorial: (flowId: string) => void;
  nextStep: () => void;
  goToNextPage: () => void; // Navigate to next tutorial page
  dismissPageTutorial: () => void; // Close tutorial for current page (user will interact)
  skipTutorial: () => void;
  completeTutorial: () => void;
  /** Call this when user completes a required action (e.g., created first account) */
  notifyActionCompleted: (validationKey: TutorialValidationKey) => void;
  /** Resume showing tutorial after user interaction */
  resumeTutorial: () => void;
}

const TutorialContext = createContext<TutorialContextValue | null>(null);

const TUTORIAL_STORAGE_KEY = "bluemoon_tutorial_completed";
const TUTORIAL_PROGRESS_KEY = "bluemoon_tutorial_progress";

interface TutorialProgress {
  flowId: string;
  currentStepId: string;
  dismissedForPage: string | null; // Route where tutorial was dismissed
  waitingForAction: boolean; // Whether we're waiting for user action
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
  const [isWaitingForAction, setIsWaitingForAction] = useState(false);

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
          setIsWaitingForAction(progress.waitingForAction || false);

          // Show tutorial if we're on the right page and not dismissed
          if (step.route === pathname && progress.dismissedForPage !== pathname) {
            // If waiting for action, show a minimal prompt instead of full tutorial
            if (progress.waitingForAction) {
              setIsVisible(true);
            } else {
              setIsVisible(true);
            }
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
        // Check if first step requires action
        const needsAction = firstPageStep.requiresAction || false;
        setIsWaitingForAction(needsAction);
        setIsVisible(true);

        // Save progress
        saveTutorialProgress({
          flowId: currentFlow.id,
          currentStepId: firstPageStep.id,
          dismissedForPage: null,
          waitingForAction: needsAction,
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
      setIsWaitingForAction(false);
      setIsVisible(true);

      // Save progress
      saveTutorialProgress({
        flowId,
        currentStepId: firstStep.id,
        dismissedForPage: null,
        waitingForAction: false,
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
        setCurrentStep(next);
        setDismissedForPage(null);
        setIsWaitingForAction(false);
        setIsVisible(true);

        saveTutorialProgress({
          flowId: currentFlow.id,
          currentStepId: next.id,
          dismissedForPage: null,
          waitingForAction: false,
        });

        router.push(next.route);
      } else {
        // Same page, just update the step
        setCurrentStep(next);

        // Check if this step requires an action
        if (next.requiresAction) {
          setIsWaitingForAction(true);
        }

        saveTutorialProgress({
          flowId: currentFlow.id,
          currentStepId: next.id,
          dismissedForPage: dismissedForPage,
          waitingForAction: next.requiresAction || false,
        });
      }
    } else {
      // No more steps - complete the tutorial
      completeTutorial();
    }
  }, [currentFlow, currentStep, dismissedForPage, router]);

  // Navigate to the next page in the tutorial flow
  const goToNextPage = useCallback(() => {
    if (!currentFlow || !currentStep) return;

    // Find the first step of the next page
    const currentIndex = currentFlow.steps.findIndex(s => s.id === currentStep.id);
    const currentRoute = currentStep.route;

    // Find next step that's on a different route
    let nextPageStep: TutorialStep | undefined;
    for (let i = currentIndex + 1; i < currentFlow.steps.length; i++) {
      if (currentFlow.steps[i].route !== currentRoute) {
        nextPageStep = currentFlow.steps[i];
        break;
      }
    }

    if (nextPageStep) {
      setCurrentStep(nextPageStep);
      setDismissedForPage(null);
      // Check if first step of next page requires action
      const needsAction = nextPageStep.requiresAction || false;
      setIsWaitingForAction(needsAction);
      setIsVisible(true);

      saveTutorialProgress({
        flowId: currentFlow.id,
        currentStepId: nextPageStep.id,
        dismissedForPage: null,
        waitingForAction: needsAction,
      });

      router.push(nextPageStep.route);
    } else {
      // No more pages - complete the tutorial
      completeTutorial();
    }
  }, [currentFlow, currentStep, router]);

  const dismissPageTutorial = useCallback(() => {
    if (!currentFlow || !currentStep) return;

    // Hide the tutorial overlay but keep the floating button
    setIsVisible(false);
    setDismissedForPage(pathname);

    // Save progress with current step (don't advance yet)
    saveTutorialProgress({
      flowId: currentFlow.id,
      currentStepId: currentStep.id,
      dismissedForPage: pathname,
      waitingForAction: false,
    });
  }, [currentFlow, currentStep, pathname]);

  // Called when user completes a required action
  const notifyActionCompleted = useCallback(
    (validationKey: TutorialValidationKey) => {
      if (!currentFlow || !currentStep) return;

      // Check if this matches the current step's validation key
      if (currentStep.validationKey === validationKey && isWaitingForAction) {
        // Action completed! Navigate to next page
        setIsWaitingForAction(false);
        goToNextPage();
      }
    },
    [currentFlow, currentStep, isWaitingForAction, goToNextPage]
  );

  // Resume tutorial after user interaction
  const resumeTutorial = useCallback(() => {
    if (!currentFlow || !currentStep) return;

    setIsVisible(true);
    setDismissedForPage(null);

    saveTutorialProgress({
      flowId: currentFlow.id,
      currentStepId: currentStep.id,
      dismissedForPage: null,
      waitingForAction: isWaitingForAction,
    });
  }, [currentFlow, currentStep, isWaitingForAction]);

  const skipTutorial = useCallback(() => {
    localStorage.setItem(TUTORIAL_STORAGE_KEY, "true");
    saveTutorialProgress(null);
    setCurrentFlow(null);
    setCurrentStep(null);
    setIsVisible(false);
    setDismissedForPage(null);
    setIsWaitingForAction(false);
  }, []);

  const completeTutorial = useCallback(() => {
    localStorage.setItem(TUTORIAL_STORAGE_KEY, "true");
    saveTutorialProgress(null);
    setCurrentFlow(null);
    setCurrentStep(null);
    setIsVisible(false);
    setDismissedForPage(null);
    setIsWaitingForAction(false);
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
    isWaitingForAction,
    startTutorial,
    nextStep,
    goToNextPage,
    dismissPageTutorial,
    skipTutorial,
    completeTutorial,
    notifyActionCompleted,
    resumeTutorial,
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
