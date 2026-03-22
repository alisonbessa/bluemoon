import type { CategorySummary, MonthSummary } from "./query-helpers";
import { getAccountIcon } from "./query-helpers";

// ============================================
// Balance / Month Summary formatting
// ============================================

export interface BalanceFormatOptions {
  summary: MonthSummary;
  year: number;
  month: number;
  isDuo: boolean;
  scope?: "individual" | "couple";
  hasContribution: boolean;
  totalContribution: number;
  totalFullIncome: number;
  visibleTopCategories: CategorySummary[];
  formatCurrency: (value: number) => string;
}

/**
 * Format the balance/month summary message as HTML.
 */
export function formatBalanceMessage(opts: BalanceFormatOptions): string {
  const {
    summary,
    year,
    month,
    isDuo,
    scope,
    hasContribution,
    totalContribution,
    totalFullIncome,
    visibleTopCategories,
    formatCurrency,
  } = opts;

  const monthName = new Date(year, month - 1).toLocaleDateString("pt-BR", { month: "long" });

  let message = `<b>Resumo de ${monthName}/${year}</b>\n\n`;

  if (isDuo && scope === "individual") {
    // Individual view: show only the user's own data
    const myBalance = summary.myIncome - summary.myExpenses;
    const balanceEmoji = myBalance >= 0 ? "+" : "";
    message += `<b>Seus números:</b>\n`;
    message += `Saldo: ${balanceEmoji}${formatCurrency(myBalance)}\n`;
    message += `Suas receitas: ${formatCurrency(summary.myIncome)}\n`;
    message += `Seus gastos: ${formatCurrency(summary.myExpenses)}\n`;
  } else if (isDuo && scope === "couple") {
    // Couple view: show contribution-based data when available
    if (hasContribution) {
      const contributionBalance = totalContribution - summary.totalExpenses;
      const balanceEmoji = contributionBalance >= 0 ? "+" : "";
      message += `<b>Números do casal:</b>\n`;
      message += `Contribuição do casal: ${formatCurrency(totalContribution)}\n`;
      message += `Despesas compartilhadas: ${formatCurrency(summary.totalExpenses)}\n`;
      message += `Saldo compartilhado: ${balanceEmoji}${formatCurrency(contributionBalance)}\n`;
      const personalReserve = totalFullIncome - totalContribution;
      if (personalReserve > 0) {
        message += `\n<i>(Renda total: ${formatCurrency(totalFullIncome)} | Reserva pessoal: ${formatCurrency(personalReserve)})</i>\n`;
      }
    } else {
      const balanceEmoji = summary.balance >= 0 ? "+" : "";
      message += `<b>Números do casal:</b>\n`;
      message += `Saldo: ${balanceEmoji}${formatCurrency(summary.balance)}\n`;
      message += `Receitas totais: ${formatCurrency(summary.totalIncome)}\n`;
      message += `Despesas totais: ${formatCurrency(summary.totalExpenses)}\n`;
    }
  } else if (isDuo) {
    // Default for duo: show contribution-based when available
    if (hasContribution) {
      const contributionBalance = totalContribution - summary.totalExpenses;
      const balanceEmoji = contributionBalance >= 0 ? "+" : "";
      message += `<b>Saldo compartilhado:</b> ${balanceEmoji}${formatCurrency(contributionBalance)}\n`;
      message += `Contribuição: ${formatCurrency(totalContribution)}\n`;
      message += `Despesas totais: ${formatCurrency(summary.totalExpenses)}\n`;
      message += `Seus gastos: ${formatCurrency(summary.myExpenses)}\n`;
      const personalReserve = totalFullIncome - totalContribution;
      if (personalReserve > 0) {
        message += `\n<i>(Renda total: ${formatCurrency(totalFullIncome)} | Reserva pessoal: ${formatCurrency(personalReserve)})</i>\n`;
      }
    } else {
      const balanceEmoji = summary.balance >= 0 ? "+" : "";
      message += `<b>Saldo:</b> ${balanceEmoji}${formatCurrency(summary.balance)}\n`;
      message += `Receitas: ${formatCurrency(summary.totalIncome)}\n`;
      message += `Despesas totais: ${formatCurrency(summary.totalExpenses)}\n`;
      message += `Seus gastos: ${formatCurrency(summary.myExpenses)}\n`;
    }
  } else {
    // Solo budget
    const balanceEmoji = summary.balance >= 0 ? "+" : "";
    message += `<b>Saldo:</b> ${balanceEmoji}${formatCurrency(summary.balance)}\n`;
    message += `Receitas: ${formatCurrency(summary.totalIncome)}\n`;
    message += `Despesas: ${formatCurrency(summary.totalExpenses)}\n`;
  }

  // Top categories
  if (visibleTopCategories.length > 0) {
    message += `\n<b>Maiores gastos:</b>\n`;
    for (const cat of visibleTopCategories.slice(0, 5)) {
      const icon = cat.categoryIcon || "📁";
      message += `${icon} ${cat.categoryName}: ${formatCurrency(cat.spent)}\n`;
    }
  }

  return message;
}

// ============================================
// Category formatting
// ============================================

export interface CategoryFormatOptions {
  categoryName: string;
  categoryIcon: string | null;
  categoryInfo: CategorySummary;
  year: number;
  month: number;
  formatCurrency: (value: number) => string;
}

/**
 * Format a single category detail message as HTML.
 */
export function formatCategoryMessage(opts: CategoryFormatOptions): string {
  const { categoryName, categoryIcon, categoryInfo, year, month, formatCurrency } = opts;

  const icon = categoryIcon || "📁";
  const percentUsed = categoryInfo.allocated > 0
    ? Math.round((categoryInfo.spent / categoryInfo.allocated) * 100)
    : 0;

  let statusEmoji = "✅";
  if (percentUsed > 100) {
    statusEmoji = "🔴";
  } else if (percentUsed > 80) {
    statusEmoji = "🟡";
  }

  const monthName = new Date(year, month - 1).toLocaleDateString("pt-BR", { month: "long" });

  let message = `${icon} <b>${categoryName}</b> - ${monthName}\n\n`;
  message += `${statusEmoji} Usado: ${percentUsed}%\n`;
  message += `Planejado: ${formatCurrency(categoryInfo.allocated)}\n`;
  message += `Gasto: ${formatCurrency(categoryInfo.spent)}\n`;
  message += `Restante: ${formatCurrency(categoryInfo.remaining)}\n`;

  if (categoryInfo.remaining < 0) {
    message += `\nVocê ultrapassou o limite em ${formatCurrency(Math.abs(categoryInfo.remaining))}`;
  }

  return message;
}

// ============================================
// Goal formatting
// ============================================

/**
 * Format a single goal detail message as HTML (with progress bar).
 */
export function formatGoalMessage(
  goal: { name: string; icon?: string | null; targetAmount: number; currentAmount: number },
  formatCurrency: (value: number) => string
): string {
  const progress = goal.targetAmount > 0
    ? Math.round((goal.currentAmount / goal.targetAmount) * 100)
    : 0;
  const remaining = goal.targetAmount - goal.currentAmount;
  const icon = goal.icon || "🎯";

  // Progress bar
  const filledBlocks = Math.round(progress / 10);
  const emptyBlocks = 10 - filledBlocks;
  const progressBar = "█".repeat(filledBlocks) + "░".repeat(emptyBlocks);

  let message = `${icon} <b>${goal.name}</b>\n\n`;
  message += `${progressBar} ${progress}%\n\n`;
  message += `Valor atual: ${formatCurrency(goal.currentAmount)}\n`;
  message += `Meta: ${formatCurrency(goal.targetAmount)}\n`;
  message += `Falta: ${formatCurrency(remaining)}\n`;

  return message;
}

/**
 * Format a list of goals as HTML.
 */
export function formatGoalsListMessage(
  goals: Array<{ name: string; icon?: string | null; targetAmount: number; currentAmount: number }>,
  formatCurrency: (value: number) => string
): string {
  let message = "<b>Suas Metas</b>\n\n";

  for (const goal of goals) {
    const progress = goal.targetAmount > 0
      ? Math.round((goal.currentAmount / goal.targetAmount) * 100)
      : 0;
    const icon = goal.icon || "🎯";
    const remaining = goal.targetAmount - goal.currentAmount;

    message += `${icon} <b>${goal.name}</b>\n`;
    message += `Progresso: ${progress}%\n`;
    message += `Atual: ${formatCurrency(goal.currentAmount)} / ${formatCurrency(goal.targetAmount)}\n`;
    message += `Falta: ${formatCurrency(remaining)}\n\n`;
  }

  return message;
}

// ============================================
// Account formatting
// ============================================

/**
 * Format a single account detail message as HTML.
 */
export function formatAccountMessage(
  account: {
    name: string;
    type: string;
    balance: number;
    creditLimit?: number | null;
    closingDay?: number | null;
    dueDay?: number | null;
  },
  formatCurrency: (value: number) => string
): string {
  const icon = getAccountIcon(account.type);
  const balanceEmoji = account.balance >= 0 ? "✅" : "🔴";

  let message = `${icon} <b>${account.name}</b>\n\n`;
  message += `${balanceEmoji} Saldo: ${formatCurrency(account.balance)}\n`;

  if (account.type === "credit_card") {
    if (account.creditLimit) {
      const used = account.balance;
      const available = account.creditLimit - used;
      const percentUsed = Math.round((used / account.creditLimit) * 100);
      message += `\nLimite: ${formatCurrency(account.creditLimit)}\n`;
      message += `Usado: ${formatCurrency(used)} (${percentUsed}%)\n`;
      message += `Disponível: ${formatCurrency(available)}\n`;
    }
    if (account.closingDay) {
      message += `\nFechamento: dia ${account.closingDay}`;
    }
    if (account.dueDay) {
      message += `\nVencimento: dia ${account.dueDay}`;
    }
  }

  return message;
}

/**
 * Format a list of accounts as HTML.
 */
export function formatAccountsListMessage(
  accounts: Array<{
    name: string;
    type: string;
    balance: number;
    creditLimit?: number | null;
  }>,
  formatCurrency: (value: number) => string
): string {
  let message = "<b>Suas Contas</b>\n\n";

  for (const account of accounts) {
    const icon = getAccountIcon(account.type);
    const balanceEmoji = account.balance >= 0 ? "" : "🔴 ";
    message += `${icon} <b>${account.name}</b>\n`;
    message += `${balanceEmoji}Saldo: ${formatCurrency(account.balance)}\n`;
    if (account.type === "credit_card" && account.creditLimit) {
      const available = account.creditLimit - account.balance;
      message += `Limite disponível: ${formatCurrency(available)}\n`;
    }
    message += "\n";
  }

  return message;
}
