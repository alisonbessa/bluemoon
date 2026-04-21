/**
 * Budget Templates
 *
 * Pre-configured budget templates for the onboarding wizard.
 * Each template defines categories with percentage-based allocations
 * that are applied to the user's total income.
 *
 * Personal expense groups are created separately per member during onboarding —
 * they are NOT defined here.
 */

export type GroupCode = "essential" | "lifestyle" | "investments" | "goals";
export type CategoryBehavior = "refill_up" | "set_aside";

export interface TemplateCategory {
  name: string;
  groupCode: GroupCode;
  percentage: number; // fraction of income (0.30 = 30%)
  behavior: CategoryBehavior;
  icon: string;
}

export interface BudgetTemplate {
  codename: string;
  label: string;
  description: string;
  planType: "solo" | "duo";
  categories: TemplateCategory[];
}

const TEMPLATES: BudgetTemplate[] = [
  // ===== SOLO TEMPLATES =====
  {
    codename: "solteiro",
    label: "Solteiro(a)",
    description: "Para quem quer organizar suas finanças pessoais",
    planType: "solo",
    categories: [
      // Essential (56%)
      { name: "Moradia", groupCode: "essential", percentage: 0.30, behavior: "refill_up", icon: "🏠" },
      { name: "Contas de Casa", groupCode: "essential", percentage: 0.05, behavior: "refill_up", icon: "💡" },
      { name: "Mercado", groupCode: "essential", percentage: 0.10, behavior: "refill_up", icon: "🛒" },
      { name: "Transporte", groupCode: "essential", percentage: 0.08, behavior: "refill_up", icon: "🚗" },
      { name: "Saúde", groupCode: "essential", percentage: 0.03, behavior: "refill_up", icon: "🏥" },
      // Lifestyle (21%) — absorbs the former ~5% personal allocation
      { name: "Alimentação Fora", groupCode: "lifestyle", percentage: 0.06, behavior: "refill_up", icon: "🍔" },
      { name: "Lazer", groupCode: "lifestyle", percentage: 0.07, behavior: "refill_up", icon: "🎬" },
      { name: "Vestuário e Beleza", groupCode: "lifestyle", percentage: 0.05, behavior: "refill_up", icon: "👕" },
      { name: "Assinaturas", groupCode: "lifestyle", percentage: 0.03, behavior: "refill_up", icon: "📱" },
      // Investments (15%)
      { name: "Reserva de Emergência", groupCode: "investments", percentage: 0.10, behavior: "set_aside", icon: "🛡️" },
      { name: "Investimentos", groupCode: "investments", percentage: 0.05, behavior: "set_aside", icon: "📈" },
    ],
  },
  {
    codename: "universitario",
    label: "Universitário(a)",
    description: "Budget enxuto para quem está estudando",
    planType: "solo",
    categories: [
      // Essential (60%)
      { name: "Moradia", groupCode: "essential", percentage: 0.35, behavior: "refill_up", icon: "🏠" },
      { name: "Mercado", groupCode: "essential", percentage: 0.15, behavior: "refill_up", icon: "🛒" },
      { name: "Transporte", groupCode: "essential", percentage: 0.10, behavior: "refill_up", icon: "🚌" },
      // Lifestyle (25%)
      { name: "Alimentação Fora", groupCode: "lifestyle", percentage: 0.08, behavior: "refill_up", icon: "🍔" },
      { name: "Lazer", groupCode: "lifestyle", percentage: 0.09, behavior: "refill_up", icon: "🎬" },
      { name: "Materiais e Educação", groupCode: "lifestyle", percentage: 0.08, behavior: "refill_up", icon: "📚" },
      // Investments (10%)
      { name: "Reserva de Emergência", groupCode: "investments", percentage: 0.10, behavior: "set_aside", icon: "🛡️" },
    ],
  },

  // ===== DUO TEMPLATES =====
  {
    codename: "casal_sem_filhos",
    label: "Casal sem filhos",
    description: "Para casais organizando as finanças juntos",
    planType: "duo",
    categories: [
      // Essential (58%)
      { name: "Moradia", groupCode: "essential", percentage: 0.30, behavior: "refill_up", icon: "🏠" },
      { name: "Contas de Casa", groupCode: "essential", percentage: 0.05, behavior: "refill_up", icon: "💡" },
      { name: "Mercado", groupCode: "essential", percentage: 0.12, behavior: "refill_up", icon: "🛒" },
      { name: "Transporte", groupCode: "essential", percentage: 0.08, behavior: "refill_up", icon: "🚗" },
      { name: "Saúde", groupCode: "essential", percentage: 0.03, behavior: "refill_up", icon: "🏥" },
      // Lifestyle (17%) — includes former per-person personal allocation
      { name: "Alimentação Fora", groupCode: "lifestyle", percentage: 0.05, behavior: "refill_up", icon: "🍔" },
      { name: "Lazer", groupCode: "lifestyle", percentage: 0.05, behavior: "refill_up", icon: "🎬" },
      { name: "Vestuário e Beleza", groupCode: "lifestyle", percentage: 0.04, behavior: "refill_up", icon: "👕" },
      { name: "Assinaturas", groupCode: "lifestyle", percentage: 0.03, behavior: "refill_up", icon: "📱" },
      // Investments (15%)
      { name: "Reserva de Emergência", groupCode: "investments", percentage: 0.10, behavior: "set_aside", icon: "🛡️" },
      { name: "Investimentos", groupCode: "investments", percentage: 0.05, behavior: "set_aside", icon: "📈" },
    ],
  },
  {
    codename: "casal_com_filhos",
    label: "Casal com filhos",
    description: "Para famílias com crianças",
    planType: "duo",
    categories: [
      // Essential (66%)
      { name: "Moradia", groupCode: "essential", percentage: 0.28, behavior: "refill_up", icon: "🏠" },
      { name: "Contas de Casa", groupCode: "essential", percentage: 0.05, behavior: "refill_up", icon: "💡" },
      { name: "Mercado", groupCode: "essential", percentage: 0.12, behavior: "refill_up", icon: "🛒" },
      { name: "Transporte", groupCode: "essential", percentage: 0.08, behavior: "refill_up", icon: "🚗" },
      { name: "Saúde", groupCode: "essential", percentage: 0.03, behavior: "refill_up", icon: "🏥" },
      { name: "Escola / Creche", groupCode: "essential", percentage: 0.10, behavior: "refill_up", icon: "🎓" },
      // Lifestyle (16%)
      { name: "Alimentação Fora", groupCode: "lifestyle", percentage: 0.04, behavior: "refill_up", icon: "🍔" },
      { name: "Lazer", groupCode: "lifestyle", percentage: 0.04, behavior: "refill_up", icon: "🎬" },
      { name: "Vestuário", groupCode: "lifestyle", percentage: 0.02, behavior: "refill_up", icon: "👕" },
      { name: "Assinaturas", groupCode: "lifestyle", percentage: 0.02, behavior: "refill_up", icon: "📱" },
      { name: "Atividades Infantis", groupCode: "lifestyle", percentage: 0.02, behavior: "refill_up", icon: "🎨" },
      { name: "Roupas e Material Escolar", groupCode: "lifestyle", percentage: 0.02, behavior: "refill_up", icon: "🎒" },
      // Investments (8%)
      { name: "Reserva de Emergência", groupCode: "investments", percentage: 0.05, behavior: "set_aside", icon: "🛡️" },
      { name: "Investimentos", groupCode: "investments", percentage: 0.03, behavior: "set_aside", icon: "📈" },
    ],
  },
];

/**
 * Get templates available for a given plan type
 */
export function getTemplatesForPlan(planCodename: string): BudgetTemplate[] {
  const planType = planCodename === "duo" ? "duo" : "solo";
  return TEMPLATES.filter((t) => t.planType === planType);
}

/**
 * Get a specific template by codename
 */
export function getTemplateByCodename(codename: string): BudgetTemplate | undefined {
  return TEMPLATES.find((t) => t.codename === codename);
}

/**
 * Get the default template for a plan type.
 * Used when skipping the profile selection step.
 */
export function getDefaultTemplateForPlan(planCodename: string): BudgetTemplate {
  const planType = planCodename === "duo" ? "duo" : "solo";
  const defaults: Record<string, string> = {
    solo: "solteiro",
    duo: "casal_sem_filhos",
  };
  return TEMPLATES.find((t) => t.codename === defaults[planType])!;
}

/**
 * Calculate planned amounts from a template and total income
 * Returns categories with plannedAmount in cents
 */
export function calculatePlannedAmounts(
  template: BudgetTemplate,
  totalIncomeCents: number
): (TemplateCategory & { plannedAmount: number })[] {
  return template.categories.map((cat) => ({
    ...cat,
    plannedAmount: Math.round(totalIncomeCents * cat.percentage),
  }));
}
