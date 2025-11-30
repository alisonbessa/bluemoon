// Tutorial step definitions for each flow

export interface TutorialStep {
  id: string;
  title: string;
  content: string;
  target?: string; // CSS selector for element to highlight (optional for intro screens)
  placement?: "top" | "bottom" | "left" | "right" | "center";
  nextRoute?: string; // Route to navigate to after this step
}

export interface TutorialFlow {
  id: string;
  name: string;
  steps: TutorialStep[];
}

export const TUTORIAL_FLOWS: Record<string, TutorialFlow> = {
  "post-onboarding": {
    id: "post-onboarding",
    name: "Primeiros Passos",
    steps: [
      {
        id: "accounts-intro",
        title: "Suas Contas",
        content:
          "Aqui ficam suas contas financeiras. Você pode editar nomes, adicionar novas contas ou remover as que não precisa.",
        placement: "center",
        nextRoute: "/app/accounts/setup",
      },
      {
        id: "accounts-edit",
        title: "Edite suas contas",
        content:
          "Clique em qualquer conta para editar o nome, saldo inicial ou outras informações.",
        target: "[data-tutorial='account-item']",
        placement: "bottom",
      },
      {
        id: "accounts-add",
        title: "Adicione contas",
        content:
          "Use o botão + para adicionar novas contas ao seu orçamento.",
        target: "[data-tutorial='add-account-button']",
        placement: "left",
      },
      {
        id: "income-intro",
        title: "Fontes de Renda",
        content:
          "Agora vamos configurar suas fontes de renda. Adicione salário, freelas, benefícios e outras rendas.",
        placement: "center",
        nextRoute: "/app/income/setup",
      },
      {
        id: "income-add",
        title: "Adicione suas rendas",
        content:
          "Clique aqui para adicionar uma fonte de renda. Você pode ter várias!",
        target: "[data-tutorial='add-income-button']",
        placement: "bottom",
      },
      {
        id: "budget-intro",
        title: "Seu Orçamento",
        content:
          "Este é o coração do HiveBudget! Aqui você aloca dinheiro para cada categoria e acompanha seus gastos.",
        placement: "center",
        nextRoute: "/app/budget",
      },
      {
        id: "budget-allocate",
        title: "Aloque dinheiro",
        content:
          "Clique em uma categoria para definir quanto quer gastar nela este mês.",
        target: "[data-tutorial='category-row']",
        placement: "bottom",
      },
      {
        id: "complete",
        title: "Pronto!",
        content:
          "Você está pronto para começar a controlar suas finanças. Explore as outras abas para ver transações, relatórios e mais!",
        placement: "center",
        nextRoute: "/app",
      },
    ],
  },
};

export function getTutorialFlow(flowId: string): TutorialFlow | undefined {
  return TUTORIAL_FLOWS[flowId];
}

export function getTutorialStep(
  flowId: string,
  stepId: string
): TutorialStep | undefined {
  const flow = getTutorialFlow(flowId);
  return flow?.steps.find((step) => step.id === stepId);
}

export function getNextStep(
  flowId: string,
  currentStepId: string
): TutorialStep | undefined {
  const flow = getTutorialFlow(flowId);
  if (!flow) return undefined;

  const currentIndex = flow.steps.findIndex((s) => s.id === currentStepId);
  if (currentIndex === -1 || currentIndex === flow.steps.length - 1) {
    return undefined;
  }

  return flow.steps[currentIndex + 1];
}

export function getPreviousStep(
  flowId: string,
  currentStepId: string
): TutorialStep | undefined {
  const flow = getTutorialFlow(flowId);
  if (!flow) return undefined;

  const currentIndex = flow.steps.findIndex((s) => s.id === currentStepId);
  if (currentIndex <= 0) {
    return undefined;
  }

  return flow.steps[currentIndex - 1];
}
