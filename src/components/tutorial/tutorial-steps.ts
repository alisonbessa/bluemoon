// Tutorial step definitions for each flow
// Steps are grouped by page - user sees all steps for a page,
// then clicks "Entendi" to dismiss and interact with the page.
// When navigating to the next tutorial page, tutorial auto-reopens.

export interface TutorialStep {
  id: string;
  title: string;
  content: string;
  targetSelector?: string; // CSS selector for spotlight effect
  placement?: "top" | "bottom" | "left" | "right" | "center";
  route: string; // The route this step belongs to
}

export interface TutorialFlow {
  id: string;
  name: string;
  steps: TutorialStep[];
}

export const TUTORIAL_FLOWS: Record<string, TutorialFlow> = {
  // Tutorial simplificado para usuarios convidados
  "invited-user": {
    id: "invited-user",
    name: "Bem-vindo ao Orcamento",
    steps: [
      {
        id: "invited-welcome",
        route: "/app",
        title: "Bem-vindo!",
        content: "Você faz parte de um orçamento compartilhado. Conheça o app!",
        placement: "center",
      },
      {
        id: "invited-nav-planning",
        route: "/app",
        title: "Planejamento",
        content: "Veja como o orçamento está distribuído entre as categorias.",
        targetSelector: '[data-tutorial="nav-planning"]',
        placement: "bottom",
      },
      {
        id: "invited-nav-accounts",
        route: "/app",
        title: "Contas",
        content: "Adicione suas contas e registre transações.",
        targetSelector: '[data-tutorial="nav-accounts"]',
        placement: "bottom",
      },
      {
        id: "invited-done",
        route: "/app",
        title: "Pronto!",
        content: "Comece a usar o app com os outros membros!",
        placement: "center",
      },
    ],
  },

  // Tutorial completo para novos usuarios apos onboarding
  "post-onboarding": {
    id: "post-onboarding",
    name: "Primeiros Passos",
    steps: [
      // ===== ACCOUNTS PAGE =====
      {
        id: "accounts-welcome",
        route: "/app/accounts/setup",
        title: "Suas Contas",
        content: "Gerencie contas bancárias, cartões e investimentos.",
        placement: "center",
      },
      {
        id: "accounts-add-button",
        route: "/app/accounts/setup",
        title: "Adicionar Conta",
        content: "Adicione novas contas aqui.",
        targetSelector: '[data-tutorial="add-account-button"]',
        placement: "bottom",
      },
      {
        id: "accounts-item",
        route: "/app/accounts/setup",
        title: "Editar Conta",
        content: "Clique para editar nome, ícone ou saldo.",
        targetSelector: '[data-tutorial="account-item"]',
        placement: "bottom",
      },
      {
        id: "accounts-done",
        route: "/app/accounts/setup",
        title: "Sua vez!",
        content: "Personalize suas contas. Depois vá para Rendas no menu.",
        placement: "center",
      },

      // ===== INCOME PAGE =====
      {
        id: "income-welcome",
        route: "/app/income/setup",
        title: "Suas Rendas",
        content: "Cadastre salário, freelas, benefícios e outras fontes.",
        placement: "center",
      },
      {
        id: "income-add-button",
        route: "/app/income/setup",
        title: "Adicionar Renda",
        content: "Informe valor, frequência e dia do pagamento.",
        targetSelector: '[data-tutorial="add-income-button"]',
        placement: "bottom",
      },
      {
        id: "income-done",
        route: "/app/income/setup",
        title: "Sua vez!",
        content: "Adicione suas rendas. Depois vá para Metas.",
        placement: "center",
      },

      // ===== GOALS PAGE =====
      {
        id: "goals-welcome",
        route: "/app/goals",
        title: "Suas Metas",
        content: "Defina objetivos e veja quanto guardar por mês.",
        placement: "center",
      },
      {
        id: "goals-add",
        route: "/app/goals",
        title: "Nova Meta",
        content: "Crie metas com valor alvo e prazo.",
        targetSelector: '[data-tutorial="add-goal-button"]',
        placement: "bottom",
      },
      {
        id: "goals-done",
        route: "/app/goals",
        title: "Sua vez!",
        content: "Crie suas metas. Depois vá para Planejamento.",
        placement: "center",
      },

      // ===== BUDGET PAGE =====
      {
        id: "budget-welcome",
        route: "/app/budget",
        title: "Seu Orçamento",
        content: "Aloque cada real em categorias específicas.",
        placement: "center",
      },
      {
        id: "budget-available",
        route: "/app/budget",
        title: "Disponível",
        content: "Quanto ainda precisa alocar. Objetivo: zerar!",
        targetSelector: '[data-tutorial="budget-available"]',
        placement: "bottom",
      },
      {
        id: "budget-category",
        route: "/app/budget",
        title: "Categorias",
        content: "Clique para definir o valor de cada categoria.",
        targetSelector: '[data-tutorial="category-row"]',
        placement: "right",
      },
      {
        id: "budget-done",
        route: "/app/budget",
        title: "Sua vez!",
        content: "Distribua seu dinheiro. Depois volte ao Dashboard.",
        placement: "center",
      },

      // ===== NAVIGATION/HEADER =====
      {
        id: "nav-welcome",
        route: "/app",
        title: "Navegação",
        content: "Conheça as áreas principais do app.",
        placement: "center",
      },
      {
        id: "nav-dashboard",
        route: "/app",
        title: "Dashboard",
        content: "Resumo das finanças e próximos compromissos.",
        targetSelector: '[data-tutorial="nav-dashboard"]',
        placement: "bottom",
      },
      {
        id: "nav-goals",
        route: "/app",
        title: "Metas",
        content: "Acompanhe o progresso das suas metas.",
        targetSelector: '[data-tutorial="nav-goals"]',
        placement: "bottom",
      },
      {
        id: "nav-planning",
        route: "/app",
        title: "Planejamento",
        content: "Aloque dinheiro e acompanhe gastos.",
        targetSelector: '[data-tutorial="nav-planning"]',
        placement: "bottom",
      },
      {
        id: "nav-accounts",
        route: "/app",
        title: "Contas",
        content: "Gerencie saldos e transações.",
        targetSelector: '[data-tutorial="nav-accounts"]',
        placement: "bottom",
      },
      {
        id: "tutorial-complete",
        route: "/app",
        title: "Pronto!",
        content: "Você conhece o app. Agora organize suas finanças!",
        placement: "center",
      },
    ],
  },
};

export function getTutorialFlow(flowId: string): TutorialFlow | undefined {
  return TUTORIAL_FLOWS[flowId];
}

export function getStepsByRoute(flowId: string, route: string): TutorialStep[] {
  const flow = getTutorialFlow(flowId);
  if (!flow) return [];
  return flow.steps.filter((step) => step.route === route);
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

export function getStepIndex(flowId: string, stepId: string): number {
  const flow = getTutorialFlow(flowId);
  if (!flow) return -1;
  return flow.steps.findIndex((s) => s.id === stepId);
}
