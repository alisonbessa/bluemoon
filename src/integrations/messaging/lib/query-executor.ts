import { db } from "@/db";
import { transactions, categories, goals, groups, monthlyAllocations, financialAccounts, budgetMembers, incomeSources } from "@/db/schema";
import { eq, and, gte, lte, sql, sum } from "drizzle-orm";
import type { UserContext, ExtractedQueryData, Intent, MessagingAdapter, ChatId } from "./types";
import { formatCurrency } from "@/shared/lib/formatters";
import { matchCategory, matchGoal, matchAccount } from "./gemini";

interface CategorySummary {
  categoryId: string;
  categoryName: string;
  categoryIcon: string | null;
  allocated: number;
  spent: number;
  remaining: number;
}

interface MonthSummary {
  totalIncome: number;
  totalExpenses: number;
  balance: number;
  topCategories: CategorySummary[];
  myExpenses: number;
  myIncome: number;
}

/**
 * Handle query intents (balance, category, goal)
 */
export async function handleQueryIntent(
  adapter: MessagingAdapter,
  chatId: ChatId,
  intent: Intent,
  data: ExtractedQueryData,
  userContext: UserContext
): Promise<void> {
  const { budgetId, currentMonth, currentYear } = userContext;

  switch (data.queryType) {
    case "balance":
      await handleBalanceQuery(adapter, chatId, budgetId, currentYear, currentMonth, userContext, data.scope);
      break;

    case "category":
      await handleCategoryQuery(adapter, chatId, data.categoryName, budgetId, currentYear, currentMonth, userContext);
      break;

    case "goal":
      await handleGoalQuery(adapter, chatId, data.goalName, userContext);
      break;

    case "account":
      await handleAccountQuery(adapter, chatId, data.accountName, userContext);
      break;

    default:
      await handleBalanceQuery(adapter, chatId, budgetId, currentYear, currentMonth, userContext);
  }
}

/**
 * Check if a category belongs to another member (privacy-relevant)
 */
function isOtherMemberCategory(
  category: { memberId?: string | null },
  userMemberId: string
): boolean {
  return category.memberId != null && category.memberId !== userMemberId;
}

/**
 * Get visible categories respecting privacy mode
 */
function getVisibleCategories(userContext: UserContext): UserContext["categories"] {
  const { privacyMode, memberId, categories } = userContext;
  if (privacyMode === "private") {
    return categories.filter((c) => !isOtherMemberCategory(c, memberId));
  }
  return categories;
}

/**
 * Get visible goals respecting privacy mode
 */
function getVisibleGoals(userContext: UserContext): UserContext["goals"] {
  const { privacyMode, memberId, goals } = userContext;
  if (privacyMode === "private") {
    return goals.filter((g) => g.memberId == null || g.memberId === memberId);
  }
  // "unified": show all goals with real amounts (like Solo)
  // Only individual transaction details are hidden in unified mode
  return goals;
}

/**
 * Handle balance query - show overall month summary
 */
async function handleBalanceQuery(
  adapter: MessagingAdapter,
  chatId: ChatId,
  budgetId: string,
  year: number,
  month: number,
  userContext: UserContext,
  scope?: "individual" | "couple"
): Promise<void> {
  // Check if this is a duo budget (2+ owner/partner members)
  const activeMembers = userContext.members.filter(
    (m) => m.type === "owner" || m.type === "partner"
  );
  const isDuo = activeMembers.length >= 2;

  const summary = await getMonthSummary(budgetId, year, month, isDuo ? userContext.memberId : undefined);

  // Check if contribution model is active (any income source has contributionAmount set)
  const hasContribution = userContext.incomeSources.some(
    (s) => s.contributionAmount != null && s.amount != null && s.contributionAmount !== s.amount
  );

  // Calculate total contribution from income sources
  const totalContribution = hasContribution
    ? userContext.incomeSources.reduce((acc, s) => {
        const amount = s.amount || 0;
        const contribution = s.contributionAmount ?? amount;
        return acc + contribution;
      }, 0)
    : summary.totalIncome;

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
      const totalIncome = userContext.incomeSources.reduce((acc, s) => acc + (s.amount || 0), 0);
      const personalReserve = totalIncome - totalContribution;
      if (personalReserve > 0) {
        message += `\n<i>(Renda total: ${formatCurrency(totalIncome)} | Reserva pessoal: ${formatCurrency(personalReserve)})</i>\n`;
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
      const totalIncome = userContext.incomeSources.reduce((acc, s) => acc + (s.amount || 0), 0);
      const personalReserve = totalIncome - totalContribution;
      if (personalReserve > 0) {
        message += `\n<i>(Renda total: ${formatCurrency(totalIncome)} | Reserva pessoal: ${formatCurrency(personalReserve)})</i>\n`;
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

  // Top categories (filtered by privacy)
  const visibleCats = getVisibleCategories(userContext);
  const visibleCatIds = new Set(visibleCats.map((c) => c.id));
  const filteredTopCategories = summary.topCategories.filter(
    (cat) => visibleCatIds.has(cat.categoryId)
  );

  if (filteredTopCategories.length > 0) {
    message += `\n<b>Maiores gastos:</b>\n`;
    for (const cat of filteredTopCategories.slice(0, 5)) {
      const icon = cat.categoryIcon || "📁";
      message += `${icon} ${cat.categoryName}: ${formatCurrency(cat.spent)}\n`;
    }
  }

  await adapter.sendMessage(chatId, message);
}

/**
 * Handle category query - show specific category details
 */
async function handleCategoryQuery(
  adapter: MessagingAdapter,
  chatId: ChatId,
  categoryName: string | undefined,
  budgetId: string,
  year: number,
  month: number,
  userContext: UserContext
): Promise<void> {
  if (!categoryName) {
    await adapter.sendMessage(chatId, "Qual categoria você gostaria de consultar?");
    return;
  }

  // Only match against visible categories (respects privacy)
  const visibleCategories = getVisibleCategories(userContext);
  const match = matchCategory(categoryName, visibleCategories);

  if (!match) {
    await adapter.sendMessage(
      chatId,
      `Não encontrei a categoria "${categoryName}".\n\n` +
        `Categorias disponíveis:\n` +
        visibleCategories.map((c) => `- ${c.name}`).join("\n")
    );
    return;
  }

  const categoryInfo = await getCategoryInfo(budgetId, match.category.id, year, month);

  const icon = match.category.icon || "📁";
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

  let message = `${icon} <b>${match.category.name}</b> - ${monthName}\n\n`;
  message += `${statusEmoji} Usado: ${percentUsed}%\n`;
  message += `Planejado: ${formatCurrency(categoryInfo.allocated)}\n`;
  message += `Gasto: ${formatCurrency(categoryInfo.spent)}\n`;
  message += `Restante: ${formatCurrency(categoryInfo.remaining)}\n`;

  if (categoryInfo.remaining < 0) {
    message += `\nVocê ultrapassou o limite em ${formatCurrency(Math.abs(categoryInfo.remaining))}`;
  }

  await adapter.sendMessage(chatId, message);
}

/**
 * Handle goal query - show goal progress
 */
async function handleGoalQuery(
  adapter: MessagingAdapter,
  chatId: ChatId,
  goalName: string | undefined,
  userContext: UserContext
): Promise<void> {
  // Apply privacy filtering to goals
  const visibleGoals = getVisibleGoals(userContext);

  if (!goalName && visibleGoals.length === 0) {
    await adapter.sendMessage(chatId, "Você ainda não tem metas cadastradas.");
    return;
  }

  // If no specific goal mentioned, show all visible goals
  if (!goalName) {
    let message = "<b>Suas Metas</b>\n\n";

    for (const goal of visibleGoals) {
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

    await adapter.sendMessage(chatId, message);
    return;
  }

  // Try to match the goal (only against visible ones)
  const match = matchGoal(goalName, visibleGoals);

  if (!match) {
    await adapter.sendMessage(
      chatId,
      `Não encontrei a meta "${goalName}".\n\n` +
        `Suas metas:\n` +
        visibleGoals.map((g) => `- ${g.name}`).join("\n")
    );
    return;
  }

  const goal = match.goal;
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

  await adapter.sendMessage(chatId, message);
}

/**
 * Handle account query - show specific account balance
 */
async function handleAccountQuery(
  adapter: MessagingAdapter,
  chatId: ChatId,
  accountName: string | undefined,
  userContext: UserContext
): Promise<void> {
  if (!accountName && userContext.accounts.length === 0) {
    await adapter.sendMessage(chatId, "Você ainda não tem contas cadastradas.");
    return;
  }

  // If no specific account mentioned, show all accounts
  if (!accountName) {
    const accountsList = await db
      .select()
      .from(financialAccounts)
      .where(eq(financialAccounts.budgetId, userContext.budgetId));

    let message = "<b>Suas Contas</b>\n\n";

    for (const account of accountsList) {
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

    await adapter.sendMessage(chatId, message);
    return;
  }

  // Try to match the account
  const match = matchAccount(accountName, userContext.accounts);

  if (!match) {
    await adapter.sendMessage(
      chatId,
      `Não encontrei a conta "${accountName}".\n\n` +
        `Suas contas:\n` +
        userContext.accounts.map((a) => `- ${a.name}`).join("\n")
    );
    return;
  }

  // Get full account details
  const [account] = await db
    .select()
    .from(financialAccounts)
    .where(eq(financialAccounts.id, match.account.id));

  if (!account) {
    await adapter.sendMessage(chatId, "Conta não encontrada.");
    return;
  }

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

  await adapter.sendMessage(chatId, message);
}

/**
 * Get icon for account type
 */
function getAccountIcon(type: string): string {
  const icons: Record<string, string> = {
    checking: "🏦",
    savings: "🐷",
    credit_card: "💳",
    cash: "💵",
    investment: "📈",
    benefit: "🍽️",
  };
  return icons[type] || "💰";
}

/**
 * Get month summary with income, expenses, and top categories
 */
async function getMonthSummary(
  budgetId: string,
  year: number,
  month: number,
  memberId?: string
): Promise<MonthSummary> {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59);

  const baseFilters = and(
    eq(transactions.budgetId, budgetId),
    eq(transactions.status, "cleared"),
    gte(transactions.date, startDate),
    lte(transactions.date, endDate)
  );

  // Run queries in parallel
  const [incomeResult, expensesByCategory, myExpenseResult, myIncomeResult] = await Promise.all([
    // Total income (whole budget)
    db.select({ total: sum(transactions.amount) })
      .from(transactions)
      .where(and(baseFilters, eq(transactions.type, "income"))),

    // Expenses by category (whole budget)
    db.select({
      categoryId: transactions.categoryId,
      categoryName: categories.name,
      categoryIcon: categories.icon,
      spent: sum(transactions.amount),
    })
      .from(transactions)
      .leftJoin(categories, eq(transactions.categoryId, categories.id))
      .where(and(baseFilters, eq(transactions.type, "expense")))
      .groupBy(transactions.categoryId, categories.name, categories.icon),

    // My expenses (individual member)
    memberId
      ? db.select({ total: sum(transactions.amount) })
          .from(transactions)
          .where(and(baseFilters, eq(transactions.type, "expense"), eq(transactions.memberId, memberId)))
      : Promise.resolve([{ total: null }]),

    // My income (individual member)
    memberId
      ? db.select({ total: sum(transactions.amount) })
          .from(transactions)
          .where(and(baseFilters, eq(transactions.type, "income"), eq(transactions.memberId, memberId)))
      : Promise.resolve([{ total: null }]),
  ]);

  const totalIncome = Number(incomeResult[0]?.total) || 0;
  const myExpenses = Number(myExpenseResult[0]?.total) || 0;
  const myIncome = Number(myIncomeResult[0]?.total) || 0;

  const totalExpenses = expensesByCategory.reduce(
    (sum, cat) => sum + (Number(cat.spent) || 0),
    0
  );

  // Sort by spent amount
  const topCategories: CategorySummary[] = expensesByCategory
    .map((cat) => ({
      categoryId: cat.categoryId || "",
      categoryName: cat.categoryName || "Sem categoria",
      categoryIcon: cat.categoryIcon,
      allocated: 0,
      spent: Number(cat.spent) || 0,
      remaining: 0,
    }))
    .sort((a, b) => b.spent - a.spent);

  return {
    totalIncome,
    totalExpenses,
    balance: totalIncome - totalExpenses,
    topCategories,
    myExpenses,
    myIncome,
  };
}

/**
 * Get detailed info for a specific category
 */
async function getCategoryInfo(
  budgetId: string,
  categoryId: string,
  year: number,
  month: number
): Promise<CategorySummary> {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59);

  // Get category details
  const [category] = await db
    .select()
    .from(categories)
    .where(eq(categories.id, categoryId));

  // Get allocation for this month
  const [allocation] = await db
    .select()
    .from(monthlyAllocations)
    .where(
      and(
        eq(monthlyAllocations.categoryId, categoryId),
        eq(monthlyAllocations.year, year),
        eq(monthlyAllocations.month, month)
      )
    );

  const allocated = allocation?.allocated || 0;

  // Get spent amount
  const spentResult = await db
    .select({
      total: sum(transactions.amount),
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.budgetId, budgetId),
        eq(transactions.categoryId, categoryId),
        eq(transactions.type, "expense"),
        eq(transactions.status, "cleared"),
        gte(transactions.date, startDate),
        lte(transactions.date, endDate)
      )
    );

  const spent = Number(spentResult[0]?.total) || 0;

  return {
    categoryId,
    categoryName: category?.name || "Sem categoria",
    categoryIcon: category?.icon || null,
    allocated,
    spent,
    remaining: allocated - spent,
  };
}
