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
  type TutorialStep,
  type TutorialFlow,
} from "./tutorial-steps";

interface TutorialContextValue {
  isActive: boolean;
  currentFlow: TutorialFlow | null;
  currentStep: TutorialStep | null;
  stepIndex: number;
  totalSteps: number;
  startTutorial: (flowId: string) => void;
  nextStep: () => void;
  skipTutorial: () => void;
  completeTutorial: () => void;
}

const TutorialContext = createContext<TutorialContextValue | null>(null);

const TUTORIAL_STORAGE_KEY = "hivebudget_tutorial_completed";

export function TutorialProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [currentFlow, setCurrentFlow] = useState<TutorialFlow | null>(null);
  const [currentStep, setCurrentStep] = useState<TutorialStep | null>(null);
  const [stepIndex, setStepIndex] = useState(0);

  // Determine current step based on URL params AND current pathname
  useEffect(() => {
    const tutorialFlow = searchParams.get("tutorial");

    if (tutorialFlow) {
      const flow = getTutorialFlow(tutorialFlow);
      if (flow) {
        setCurrentFlow(flow);

        // Find the step that matches the current pathname
        const matchingStep = flow.steps.find((step) => pathname === step.route);

        if (matchingStep) {
          setCurrentStep(matchingStep);
          setStepIndex(flow.steps.findIndex((s) => s.id === matchingStep.id));
        } else {
          // If no matching step, use the first step
          setCurrentStep(flow.steps[0]);
          setStepIndex(0);
        }
      }
    } else {
      setCurrentFlow(null);
      setCurrentStep(null);
      setStepIndex(0);
    }
  }, [searchParams, pathname]);

  const updateUrlParams = useCallback(
    (flowId: string | null, targetPath?: string) => {
      if (flowId && targetPath) {
        router.push(`${targetPath}?tutorial=${flowId}`);
      } else {
        // Remove tutorial param
        const params = new URLSearchParams(searchParams.toString());
        params.delete("tutorial");
        const newUrl = `${pathname}${params.toString() ? `?${params.toString()}` : ""}`;
        router.replace(newUrl, { scroll: false });
      }
    },
    [pathname, router, searchParams]
  );

  const startTutorial = useCallback(
    (flowId: string) => {
      const flow = getTutorialFlow(flowId);
      if (!flow || flow.steps.length === 0) return;

      const firstStep = flow.steps[0];
      setCurrentFlow(flow);
      setCurrentStep(firstStep);
      setStepIndex(0);

      // Navigate to the first step's route
      router.push(`${firstStep.route}?tutorial=${flowId}`);
    },
    [router]
  );

  const nextStep = useCallback(() => {
    if (!currentFlow || !currentStep) return;

    const next = getNextStep(currentFlow.id, currentStep.id);
    if (next) {
      // Navigate to the next step's route
      if (next.nextRoute) {
        updateUrlParams(currentFlow.id, next.nextRoute);
      } else {
        updateUrlParams(currentFlow.id, next.route);
      }
    } else {
      // No more steps - go to final destination and complete
      if (currentStep.nextRoute) {
        completeTutorial();
      }
    }
  }, [currentFlow, currentStep, updateUrlParams]);

  const skipTutorial = useCallback(() => {
    localStorage.setItem(TUTORIAL_STORAGE_KEY, "true");
    setCurrentFlow(null);
    setCurrentStep(null);
    setStepIndex(0);

    // Remove tutorial param from URL
    const params = new URLSearchParams(searchParams.toString());
    params.delete("tutorial");
    const newUrl = `${pathname}${params.toString() ? `?${params.toString()}` : ""}`;
    router.replace(newUrl, { scroll: false });
  }, [pathname, router, searchParams]);

  const completeTutorial = useCallback(() => {
    localStorage.setItem(TUTORIAL_STORAGE_KEY, "true");
    setCurrentFlow(null);
    setCurrentStep(null);
    setStepIndex(0);
    router.push("/app");
  }, [router]);

  const value: TutorialContextValue = {
    isActive: !!currentFlow && !!currentStep,
    currentFlow,
    currentStep,
    stepIndex,
    totalSteps: currentFlow?.steps.length ?? 0,
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
