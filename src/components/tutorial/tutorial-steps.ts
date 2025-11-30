// Tutorial step definitions for each flow
// Each step represents ONE page where the user can perform tasks
// The tutorial pauses on each page until the user clicks "Avançar"

export interface TutorialStep {
  id: string;
  title: string;
  content: string;
  tips?: string[]; // Optional tips for what to do on this page
  placement?: "top" | "bottom" | "left" | "right" | "center";
  nextRoute?: string; // Route to navigate to after this step
  nextLabel?: string; // Custom label for the next button
  route: string; // The route this step belongs to
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
        id: "accounts",
        route: "/app/accounts/setup",
        title: "Configure suas Contas",
        content:
          "Revise e personalize suas contas financeiras. Quando terminar, clique em Avançar para continuar.",
        tips: [
          "Clique em uma conta para editar nome ou saldo",
          "Use o botão + para adicionar novas contas",
          "Remova contas que não precisa",
        ],
        placement: "center",
        nextRoute: "/app/income/setup",
        nextLabel: "Ir para Rendas",
      },
      {
        id: "income",
        route: "/app/income/setup",
        title: "Configure suas Rendas",
        content:
          "Adicione suas fontes de renda para calcular seu orçamento mensal. Quando terminar, clique em Avançar.",
        tips: [
          "Adicione salário, freelas, benefícios",
          "Informe o dia do pagamento",
          "Associe cada renda a quem recebe",
        ],
        placement: "center",
        nextRoute: "/app/budget",
        nextLabel: "Ir para Orçamento",
      },
      {
        id: "budget",
        route: "/app/budget",
        title: "Monte seu Orçamento",
        content:
          "Este é o coração do HiveBudget! Aloque dinheiro para cada categoria. Quando terminar, clique em Concluir.",
        tips: [
          "Clique em uma categoria para alocar valor",
          "Distribua toda sua renda entre as categorias",
          "Categorias com data de vencimento aparecem no dashboard",
        ],
        placement: "center",
        nextRoute: "/app",
        nextLabel: "Concluir Tutorial",
      },
    ],
  },
};

export function getTutorialFlow(flowId: string): TutorialFlow | undefined {
  return TUTORIAL_FLOWS[flowId];
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
