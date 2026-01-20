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
  /** If true, this step requires user to complete an action before proceeding */
  requiresAction?: boolean;
  /** Validation function name to check if step is complete */
  validationKey?: string;
}

export interface TutorialFlow {
  id: string;
  name: string;
  steps: TutorialStep[];
}

export const TUTORIAL_FLOWS: Record<string, TutorialFlow> = {
  // =====================================================
  // INITIAL SETUP FLOW - Replaces onboarding modal
  // User learns using the REAL interface with spotlight
  // =====================================================
  "initial-setup": {
    id: "initial-setup",
    name: "Configuração Inicial",
    steps: [
      // ===== ACCOUNTS PAGE =====
      {
        id: "accounts-intro",
        route: "/app/accounts",
        title: "Suas Contas",
        content:
          "Vamos começar cadastrando onde seu dinheiro está. Adicione suas contas bancárias, cartões de crédito e benefícios.",
        placement: "center",
      },
      {
        id: "accounts-add",
        route: "/app/accounts",
        title: "Adicionar Conta",
        content:
          "Clique aqui para adicionar sua primeira conta. Pode ser conta corrente, poupança, cartão de crédito ou benefício (VR/VA).",
        targetSelector: '[data-tutorial="add-account-button"]',
        placement: "bottom",
      },
      {
        id: "accounts-action",
        route: "/app/accounts",
        title: "Agora é sua vez!",
        content:
          "Adicione pelo menos uma conta para continuar. Quando terminar, clique em \"Próximo\" para configurar suas rendas.",
        placement: "center",
        requiresAction: true,
        validationKey: "hasAccounts",
      },

      // ===== INCOME PAGE =====
      {
        id: "income-intro",
        route: "/app/income",
        title: "Suas Rendas",
        content:
          "Agora vamos cadastrar de onde vem seu dinheiro: salário, benefícios (VR/VA), freelas, etc.",
        placement: "center",
      },
      {
        id: "income-add",
        route: "/app/income",
        title: "Adicionar Renda",
        content:
          "Clique aqui para adicionar uma fonte de renda. Informe o valor, frequência e dia do pagamento.",
        targetSelector: '[data-tutorial="add-income-button"]',
        placement: "bottom",
      },
      {
        id: "income-benefit-tip",
        route: "/app/income",
        title: "Dica: Benefícios",
        content:
          "Para VR e VA, adicione como tipo \"Benefício\" e selecione a conta de benefício correspondente. Assim sabemos quando e quanto você recebe.",
        placement: "center",
      },
      {
        id: "income-action",
        route: "/app/income",
        title: "Agora é sua vez!",
        content:
          "Adicione pelo menos uma fonte de renda. Quando terminar, vamos para as categorias.",
        placement: "center",
        requiresAction: true,
        validationKey: "hasIncome",
      },

      // ===== CATEGORIES PAGE =====
      {
        id: "categories-intro",
        route: "/app/categories",
        title: "Suas Categorias",
        content:
          "Já criamos categorias organizadas em grupos para facilitar seu controle financeiro. Veja como está organizado!",
        placement: "center",
      },
      {
        id: "categories-groups",
        route: "/app/categories",
        title: "Grupos de Categorias",
        content:
          "Suas despesas são organizadas em: Essencial (moradia, contas, mercado), Estilo de Vida (restaurantes, compras), Prazeres (seus gastos pessoais) e Investimentos.",
        targetSelector: '[data-tutorial="category-groups"]',
        placement: "bottom",
      },
      {
        id: "categories-personal",
        route: "/app/categories",
        title: "Gastos Pessoais",
        content:
          "No grupo \"Prazeres\" você encontra sua categoria pessoal com seu nome. Use para gastos que são só seus, sem precisar justificar!",
        placement: "center",
      },
      {
        id: "categories-action",
        route: "/app/categories",
        title: "Personalize como quiser",
        content:
          "Adicione, edite ou remova categorias clicando nelas. Você pode ajustar tudo a qualquer momento. Vamos ver as metas!",
        placement: "center",
      },

      // ===== GOALS PAGE =====
      {
        id: "goals-intro",
        route: "/app/goals",
        title: "Metas Financeiras",
        content:
          "Defina objetivos como reserva de emergência, viagem ou carro novo. O sistema calcula quanto guardar por mês.",
        placement: "center",
      },
      {
        id: "goals-add",
        route: "/app/goals",
        title: "Criar uma Meta",
        content:
          "Clique aqui para criar sua primeira meta. Defina o valor e prazo desejado.",
        targetSelector: '[data-tutorial="add-goal-button"]',
        placement: "bottom",
      },
      {
        id: "goals-tip",
        route: "/app/goals",
        title: "Dica: Metas no Orçamento",
        content:
          "Suas metas aparecerão no orçamento como categorias. Assim você reserva dinheiro todo mês para alcançá-las!",
        placement: "center",
      },
      {
        id: "goals-action",
        route: "/app/goals",
        title: "Crie uma meta (opcional)",
        content:
          "Metas são opcionais, mas ajudam muito a manter o foco. Quando estiver pronto, vamos para o orçamento!",
        placement: "center",
      },

      // ===== BUDGET PAGE =====
      {
        id: "budget-intro",
        route: "/app/budget",
        title: "Seu Orçamento",
        content:
          "Este é o coração do HiveBudget! Aqui você distribui cada real da sua renda entre as categorias.",
        placement: "center",
      },
      {
        id: "budget-available",
        route: "/app/budget",
        title: "Dinheiro Disponível",
        content:
          "Este valor mostra quanto dinheiro ainda precisa ser distribuído. O objetivo é deixar zerado!",
        targetSelector: '[data-tutorial="budget-available"]',
        placement: "bottom",
      },
      {
        id: "budget-category",
        route: "/app/budget",
        title: "Alocando nas Categorias",
        content:
          "Clique em uma categoria para definir quanto quer reservar. Comece pelas despesas fixas como moradia e contas.",
        targetSelector: '[data-tutorial="category-row"]',
        placement: "right",
      },
      {
        id: "budget-goals",
        route: "/app/budget",
        title: "Suas Metas Aqui",
        content:
          "As metas que você criou aparecem como categorias no grupo \"Metas\". Reserve um valor mensal para alcançá-las!",
        targetSelector: '[data-tutorial="goals-group"]',
        placement: "right",
      },
      {
        id: "budget-action",
        route: "/app/budget",
        title: "Distribua seu dinheiro!",
        content:
          "Aloque valores nas categorias até zerar o \"Disponível\". Você pode ajustar a qualquer momento.",
        placement: "center",
        requiresAction: true,
        validationKey: "hasAllocations",
      },

      // ===== COMPLETION - DASHBOARD =====
      {
        id: "setup-complete",
        route: "/app",
        title: "Parabéns! 🎉",
        content:
          "Sua plataforma está configurada! Use o menu para navegar entre as seções. Bom planejamento financeiro!",
        placement: "center",
      },
    ],
  },

  // =====================================================
  // POST-ONBOARDING FLOW - Legacy, for users who already onboarded
  // =====================================================
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
        title: "Agora é sua vez!",
        content:
          "Personalize suas contas: edite nomes, ajuste saldos e adicione novas se precisar. Quando terminar, vá para a página de Rendas no menu.",
        placement: "center",
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
        title: "Agora é sua vez!",
        content:
          "Adicione suas fontes de renda. Quando terminar, vá para a página de Orçamento no menu para distribuir seu dinheiro.",
        placement: "center",
      },

      // ===== GOALS PAGE =====
      {
        id: "goals-welcome",
        route: "/app/goals",
        title: "Suas Metas Financeiras",
        content:
          "Defina objetivos de curto e longo prazo. O sistema calcula automaticamente quanto você precisa guardar por mês para alcançar cada meta.",
        placement: "center",
      },
      {
        id: "goals-add",
        route: "/app/goals",
        title: "Criar uma Meta",
        content:
          "Clique aqui para criar sua primeira meta. Defina o valor alvo e a data limite.",
        targetSelector: '[data-tutorial="add-goal-button"]',
        placement: "bottom",
      },
      {
        id: "goals-done",
        route: "/app/goals",
        title: "Agora é sua vez!",
        content:
          "Crie metas para seus objetivos financeiros. Quando terminar, vá para o Planejamento para distribuir seu dinheiro.",
        placement: "center",
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
        title: "Agora é sua vez!",
        content:
          "Distribua seu dinheiro entre as categorias até zerar o valor disponível. Quando terminar, volte para o Dashboard.",
        placement: "center",
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
        id: "nav-goals",
        route: "/app",
        title: "Metas",
        content:
          "Acompanhe o progresso das suas metas financeiras. O sistema calcula quanto guardar por mês.",
        targetSelector: '[data-tutorial="nav-goals"]',
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
