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
  getTutorialStep,
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
  previousStep: () => void;
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

  // Check URL for tutorial params
  useEffect(() => {
    const tutorialFlow = searchParams.get("tutorial");
    const tutorialStep = searchParams.get("step");

    if (tutorialFlow) {
      const flow = getTutorialFlow(tutorialFlow);
      if (flow) {
        setCurrentFlow(flow);
        const step = tutorialStep
          ? getTutorialStep(tutorialFlow, tutorialStep)
          : flow.steps[0];
        if (step) {
          setCurrentStep(step);
          setStepIndex(flow.steps.findIndex((s) => s.id === step.id));
        }
      }
    } else {
      setCurrentFlow(null);
      setCurrentStep(null);
      setStepIndex(0);
    }
  }, [searchParams]);

  const updateUrlParams = useCallback(
    (flowId: string | null, stepId: string | null) => {
      const params = new URLSearchParams(searchParams.toString());

      if (flowId && stepId) {
        params.set("tutorial", flowId);
        params.set("step", stepId);
      } else {
        params.delete("tutorial");
        params.delete("step");
      }

      const newUrl = `${pathname}${params.toString() ? `?${params.toString()}` : ""}`;
      router.replace(newUrl, { scroll: false });
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

      // Navigate to the first step's route if specified
      if (firstStep.nextRoute) {
        router.push(`${firstStep.nextRoute}?tutorial=${flowId}&step=${firstStep.id}`);
      } else {
        updateUrlParams(flowId, firstStep.id);
      }
    },
    [router, updateUrlParams]
  );

  const nextStep = useCallback(() => {
    if (!currentFlow || !currentStep) return;

    const next = getNextStep(currentFlow.id, currentStep.id);
    if (next) {
      setCurrentStep(next);
      setStepIndex((prev) => prev + 1);

      if (next.nextRoute) {
        router.push(`${next.nextRoute}?tutorial=${currentFlow.id}&step=${next.id}`);
      } else {
        updateUrlParams(currentFlow.id, next.id);
      }
    } else {
      // No more steps - complete the tutorial
      completeTutorial();
    }
  }, [currentFlow, currentStep, router, updateUrlParams]);

  const previousStep = useCallback(() => {
    if (!currentFlow || !currentStep || stepIndex === 0) return;

    const prevStep = currentFlow.steps[stepIndex - 1];
    if (prevStep) {
      setCurrentStep(prevStep);
      setStepIndex((prev) => prev - 1);
      updateUrlParams(currentFlow.id, prevStep.id);
    }
  }, [currentFlow, currentStep, stepIndex, updateUrlParams]);

  const skipTutorial = useCallback(() => {
    localStorage.setItem(TUTORIAL_STORAGE_KEY, "true");
    setCurrentFlow(null);
    setCurrentStep(null);
    setStepIndex(0);
    updateUrlParams(null, null);
  }, [updateUrlParams]);

  const completeTutorial = useCallback(() => {
    localStorage.setItem(TUTORIAL_STORAGE_KEY, "true");
    setCurrentFlow(null);
    setCurrentStep(null);
    setStepIndex(0);
    updateUrlParams(null, null);
    router.push("/app");
  }, [router, updateUrlParams]);

  const value: TutorialContextValue = {
    isActive: !!currentFlow && !!currentStep,
    currentFlow,
    currentStep,
    stepIndex,
    totalSteps: currentFlow?.steps.length ?? 0,
    startTutorial,
    nextStep,
    previousStep,
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
