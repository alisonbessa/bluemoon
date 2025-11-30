"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
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
  currentFlow: TutorialFlow | null;
  currentStep: TutorialStep | null;
  stepIndex: number;
  totalSteps: number;
  pageStepIndex: number; // Index within the current page's steps
  pageStepsTotal: number; // Total steps for current page
  startTutorial: (flowId: string) => void;
  nextStep: () => void;
  skipTutorial: () => void;
  completeTutorial: () => void;
}

const TutorialContext = createContext<TutorialContextValue | null>(null);

const TUTORIAL_STORAGE_KEY = "hivebudget_tutorial_completed";
const TUTORIAL_STEP_KEY = "hivebudget_tutorial_step";

export function TutorialProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [currentFlow, setCurrentFlow] = useState<TutorialFlow | null>(null);
  const [currentStep, setCurrentStep] = useState<TutorialStep | null>(null);

  // Initialize tutorial state from URL params
  useEffect(() => {
    const tutorialFlow = searchParams.get("tutorial");
    const stepId = searchParams.get("step");

    if (tutorialFlow) {
      const flow = getTutorialFlow(tutorialFlow);
      if (flow) {
        setCurrentFlow(flow);

        // If we have a step ID, use it
        if (stepId) {
          const step = flow.steps.find((s) => s.id === stepId);
          if (step && step.route === pathname) {
            setCurrentStep(step);
            return;
          }
        }

        // Otherwise, find the first step for the current route
        const pageSteps = getStepsByRoute(tutorialFlow, pathname);
        if (pageSteps.length > 0) {
          setCurrentStep(pageSteps[0]);
          // Update URL with step
          updateStepInUrl(tutorialFlow, pageSteps[0].id);
        } else {
          // No steps for this page, clear tutorial
          setCurrentStep(null);
        }
      }
    } else {
      setCurrentFlow(null);
      setCurrentStep(null);
    }
  }, [searchParams, pathname]);

  const updateStepInUrl = useCallback(
    (flowId: string, stepId: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("tutorial", flowId);
      params.set("step", stepId);
      const newUrl = `${pathname}?${params.toString()}`;
      router.replace(newUrl, { scroll: false });
    },
    [pathname, router, searchParams]
  );

  const navigateToStep = useCallback(
    (flowId: string, step: TutorialStep) => {
      const params = new URLSearchParams();
      params.set("tutorial", flowId);
      params.set("step", step.id);
      router.push(`${step.route}?${params.toString()}`);
    },
    [router]
  );

  const startTutorial = useCallback(
    (flowId: string) => {
      const flow = getTutorialFlow(flowId);
      if (!flow || flow.steps.length === 0) return;

      const firstStep = flow.steps[0];
      setCurrentFlow(flow);
      setCurrentStep(firstStep);

      // Navigate to the first step's route
      navigateToStep(flowId, firstStep);
    },
    [navigateToStep]
  );

  const nextStep = useCallback(() => {
    if (!currentFlow || !currentStep) return;

    const next = getNextStep(currentFlow.id, currentStep.id);

    if (next) {
      // Check if we're transitioning to a new page
      if (next.route !== currentStep.route) {
        // Navigate to the next page with the step
        navigateToStep(currentFlow.id, next);
      } else {
        // Same page, just update the step
        setCurrentStep(next);
        updateStepInUrl(currentFlow.id, next.id);
      }
    } else {
      // No more steps - complete the tutorial
      completeTutorial();
    }
  }, [currentFlow, currentStep, navigateToStep, updateStepInUrl]);

  const skipTutorial = useCallback(() => {
    localStorage.setItem(TUTORIAL_STORAGE_KEY, "true");
    localStorage.removeItem(TUTORIAL_STEP_KEY);
    setCurrentFlow(null);
    setCurrentStep(null);

    // Remove tutorial params from URL
    const params = new URLSearchParams(searchParams.toString());
    params.delete("tutorial");
    params.delete("step");
    const newUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname;
    router.replace(newUrl, { scroll: false });
  }, [pathname, router, searchParams]);

  const completeTutorial = useCallback(() => {
    localStorage.setItem(TUTORIAL_STORAGE_KEY, "true");
    localStorage.removeItem(TUTORIAL_STEP_KEY);
    setCurrentFlow(null);
    setCurrentStep(null);
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

  const value: TutorialContextValue = {
    isActive: !!currentFlow && !!currentStep,
    currentFlow,
    currentStep,
    stepIndex,
    totalSteps: currentFlow?.steps.length ?? 0,
    pageStepIndex,
    pageStepsTotal: pageSteps.length,
    startTutorial,
    nextStep,
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
