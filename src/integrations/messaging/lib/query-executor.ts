import { db } from "@/db";
import { transactions, categories, goals, groups, monthlyAllocations, financialAccounts } from "@/db/schema";
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
      await handleBalanceQuery(adapter, chatId, budgetId, currentYear, currentMonth);
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
      await handleBalanceQuery(adapter, chatId, budgetId, currentYear, currentMonth);
  }
}

/**
 * Handle balance query - show overall month summary
 */
async function handleBalanceQuery(
  adapter: MessagingAdapter,
  chatId: ChatId,
  budgetId: string,
  year: number,
  month: number
): Promise<void> {
  const summary = await getMonthSummary(budgetId, year, month);

  const monthName = new Date(year, month - 1).toLocaleDateString("pt-BR", { month: "long" });

  let message = `<b>Resumo de ${monthName}/${year}</b>\n\n`;

  // Balance
  const balanceEmoji = summary.balance >= 0 ? "+" : "";
  message += `<b>Saldo:</b> ${balanceEmoji}${formatCurrency(summary.balance)}\n`;
  message += `Receitas: ${formatCurrency(summary.totalIncome)}\n`;
  message += `Despesas: ${formatCurrency(summary.totalExpenses)}\n\n`;

  // Top categories
  if (summary.topCategories.length > 0) {
    message += `<b>Maiores gastos:</b>\n`;
    for (const cat of summary.topCategories.slice(0, 5)) {
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

  // Try to match the category
  const match = matchCategory(categoryName, userContext.categories);

  if (!match) {
    await adapter.sendMessage(
      chatId,
      `Não encontrei a categoria "${categoryName}".\n\n` +
        `Categorias disponíveis:\n` +
        userContext.categories.map((c) => `- ${c.name}`).join("\n")
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
  if (!goalName && userContext.goals.length === 0) {
    await adapter.sendMessage(chatId, "Você ainda não tem metas cadastradas.");
    return;
  }

  // If no specific goal mentioned, show all goals
  if (!goalName) {
    let message = "<b>Suas Metas</b>\n\n";

    for (const goal of userContext.goals) {
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

  // Try to match the goal
  const match = matchGoal(goalName, userContext.goals);

  if (!match) {
    await adapter.sendMessage(
      chatId,
      `Não encontrei a meta "${goalName}".\n\n` +
        `Suas metas:\n` +
        userContext.goals.map((g) => `- ${g.name}`).join("\n")
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
  month: number
): Promise<MonthSummary> {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59);

  // Get total income
  const incomeResult = await db
    .select({
      total: sum(transactions.amount),
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.budgetId, budgetId),
        eq(transactions.type, "income"),
        eq(transactions.status, "cleared"),
        gte(transactions.date, startDate),
        lte(transactions.date, endDate)
      )
    );

  const totalIncome = Number(incomeResult[0]?.total) || 0;

  // Get expenses by category
  const expensesByCategory = await db
    .select({
      categoryId: transactions.categoryId,
      categoryName: categories.name,
      categoryIcon: categories.icon,
      spent: sum(transactions.amount),
    })
    .from(transactions)
    .leftJoin(categories, eq(transactions.categoryId, categories.id))
    .where(
      and(
        eq(transactions.budgetId, budgetId),
        eq(transactions.type, "expense"),
        eq(transactions.status, "cleared"),
        gte(transactions.date, startDate),
        lte(transactions.date, endDate)
      )
    )
    .groupBy(transactions.categoryId, categories.name, categories.icon);

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
