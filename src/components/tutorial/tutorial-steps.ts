// Tutorial step definitions for each flow
// Steps are grouped by page - all steps for a page run sequentially,
// then user can interact, and clicking "Avançar" moves to the next page

export interface TutorialStep {
  id: string;
  title: string;
  content: string;
  targetSelector?: string; // CSS selector for spotlight effect
  placement?: "top" | "bottom" | "left" | "right" | "center";
  route: string; // The route this step belongs to
  isPageTransition?: boolean; // If true, clicking next goes to nextRoute
  nextRoute?: string; // Route to navigate to after this step
  nextLabel?: string; // Custom label for the next button
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
      // ===== ACCOUNTS PAGE =====
      {
        id: "accounts-welcome",
        route: "/app/accounts/setup",
        title: "Bem-vindo às Contas!",
        content:
          "Aqui você gerencia todas as suas contas bancárias, cartões de crédito e investimentos. Vamos conhecer a página!",
        placement: "center",
      },
      {
        id: "accounts-add-button",
        route: "/app/accounts/setup",
        title: "Adicionar Nova Conta",
        content:
          "Use este botão para adicionar novas contas. Você pode ter quantas contas precisar!",
        targetSelector: '[data-tutorial="add-account-button"]',
        placement: "bottom",
      },
      {
        id: "accounts-item",
        route: "/app/accounts/setup",
        title: "Suas Contas",
        content:
          "Cada conta aparece aqui. Clique em uma conta para editar o nome, ícone ou saldo inicial.",
        targetSelector: '[data-tutorial="account-item"]',
        placement: "bottom",
      },
      {
        id: "accounts-done",
        route: "/app/accounts/setup",
        title: "Pronto para Continuar?",
        content:
          "Personalize suas contas como preferir. Quando terminar, clique em 'Ir para Rendas' para configurar suas fontes de renda.",
        placement: "center",
        isPageTransition: true,
        nextRoute: "/app/income/setup",
        nextLabel: "Ir para Rendas",
      },

      // ===== INCOME PAGE =====
      {
        id: "income-welcome",
        route: "/app/income/setup",
        title: "Configure suas Rendas",
        content:
          "Aqui você adiciona todas as suas fontes de renda: salário, freelas, benefícios, etc. Isso ajuda a calcular seu orçamento mensal.",
        placement: "center",
      },
      {
        id: "income-add-button",
        route: "/app/income/setup",
        title: "Adicionar Renda",
        content:
          "Clique aqui para adicionar uma nova fonte de renda. Informe o valor, frequência e dia do pagamento.",
        targetSelector: '[data-tutorial="add-income-button"]',
        placement: "bottom",
      },
      {
        id: "income-summary",
        route: "/app/income/setup",
        title: "Resumo de Rendas",
        content:
          "Aqui você vê o total de rendas cadastradas e quanto receberá no mês atual.",
        targetSelector: '[data-tutorial="income-summary"]',
        placement: "bottom",
      },
      {
        id: "income-done",
        route: "/app/income/setup",
        title: "Pronto para o Orçamento?",
        content:
          "Adicione suas rendas e quando terminar, vamos para a parte mais importante: montar seu orçamento!",
        placement: "center",
        isPageTransition: true,
        nextRoute: "/app/budget",
        nextLabel: "Ir para Orçamento",
      },

      // ===== BUDGET PAGE =====
      {
        id: "budget-welcome",
        route: "/app/budget",
        title: "Monte seu Orçamento!",
        content:
          "Este é o coração do HiveBudget! Aqui você aloca cada real da sua renda em categorias específicas.",
        placement: "center",
      },
      {
        id: "budget-available",
        route: "/app/budget",
        title: "Dinheiro Disponível",
        content:
          "Este valor mostra quanto dinheiro você ainda precisa alocar. O objetivo é deixar zerado!",
        targetSelector: '[data-tutorial="budget-available"]',
        placement: "bottom",
      },
      {
        id: "budget-category",
        route: "/app/budget",
        title: "Categorias",
        content:
          "Clique em uma categoria para definir quanto quer alocar. Categorias com data de vencimento aparecem no dashboard.",
        targetSelector: '[data-tutorial="category-row"]',
        placement: "right",
      },
      {
        id: "budget-done",
        route: "/app/budget",
        title: "Quase lá!",
        content:
          "Distribua seu dinheiro entre as categorias. Quando terminar, vamos conhecer a navegação do app.",
        placement: "center",
        isPageTransition: true,
        nextRoute: "/app",
        nextLabel: "Conhecer Navegação",
      },

      // ===== NAVIGATION/HEADER =====
      {
        id: "nav-welcome",
        route: "/app",
        title: "Navegação do App",
        content:
          "Agora vamos conhecer as principais áreas do HiveBudget. Use o menu para navegar entre as seções.",
        placement: "center",
      },
      {
        id: "nav-dashboard",
        route: "/app",
        title: "Dashboard",
        content:
          "O Dashboard é sua página inicial. Aqui você vê um resumo das suas finanças e próximos compromissos.",
        targetSelector: '[data-tutorial="nav-dashboard"]',
        placement: "bottom",
      },
      {
        id: "nav-planning",
        route: "/app",
        title: "Planejamento",
        content:
          "Acesse o planejamento para alocar dinheiro e acompanhar gastos por categoria.",
        targetSelector: '[data-tutorial="nav-planning"]',
        placement: "bottom",
      },
      {
        id: "nav-accounts",
        route: "/app",
        title: "Contas",
        content:
          "Veja saldos, adicione transações e gerencie todas as suas contas aqui.",
        targetSelector: '[data-tutorial="nav-accounts"]',
        placement: "bottom",
      },
      {
        id: "tutorial-complete",
        route: "/app",
        title: "Tutorial Completo! 🎉",
        content:
          "Parabéns! Você conheceu as principais funcionalidades do HiveBudget. Agora é hora de organizar suas finanças!",
        placement: "center",
        isPageTransition: true,
        nextLabel: "Começar a Usar",
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
