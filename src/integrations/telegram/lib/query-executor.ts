import type { UserContext, ExtractedQueryData, Intent } from "./types";
import { sendMessage, formatCurrency } from "./bot";
import { matchCategory, matchGoal, matchAccount } from "./gemini";
import {
  getMonthSummary,
  getCategoryInfo,
  getVisibleCategories,
  getVisibleGoals,
  getAccountIcon,
  getAccountsList,
  getAccountById,
} from "@/integrations/shared/query-helpers";
import {
  formatBalanceMessage,
  formatCategoryMessage,
  formatGoalMessage,
  formatGoalsListMessage,
  formatAccountMessage,
  formatAccountsListMessage,
} from "@/integrations/shared/query-formatters";

/**
 * Handle query intents (balance, category, goal)
 */
export async function handleQueryIntent(
  chatId: number,
  intent: Intent,
  data: ExtractedQueryData,
  userContext: UserContext
): Promise<void> {
  const { budgetId, currentMonth, currentYear } = userContext;

  switch (data.queryType) {
    case "balance":
      await handleBalanceQuery(chatId, budgetId, currentYear, currentMonth, userContext, data.scope);
      break;

    case "category":
      await handleCategoryQuery(chatId, data.categoryName, budgetId, currentYear, currentMonth, userContext);
      break;

    case "goal":
      await handleGoalQuery(chatId, data.goalName, userContext);
      break;

    case "account":
      await handleAccountQuery(chatId, data.accountName, userContext);
      break;

    default:
      await handleBalanceQuery(chatId, budgetId, currentYear, currentMonth, userContext);
  }
}

// TODO: [Contribution Model] Update handleBalanceQuery to show contribution-based balance
// for duo budgets (same logic as messaging/lib/query-executor.ts handleBalanceQuery).
// When the budget has contribution model enabled, show "Contribuição do casal" instead of
// "Renda planejada", and show "Saldo compartilhado" with personal reserve info.

/**
 * Handle balance query - show overall month summary
 */
async function handleBalanceQuery(
  chatId: number,
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

  const totalFullIncome = userContext.incomeSources.reduce((acc, s) => acc + (s.amount || 0), 0);

  // Top categories (filtered by privacy)
  const visibleCats = getVisibleCategories(userContext.categories, userContext.privacyMode, userContext.memberId);
  const visibleCatIds = new Set(visibleCats.map((c) => c.id));
  const visibleTopCategories = summary.topCategories.filter(
    (cat) => visibleCatIds.has(cat.categoryId)
  );

  const message = formatBalanceMessage({
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
  });

  await sendMessage(chatId, message);
}

/**
 * Handle category query - show specific category details
 */
async function handleCategoryQuery(
  chatId: number,
  categoryName: string | undefined,
  budgetId: string,
  year: number,
  month: number,
  userContext: UserContext
): Promise<void> {
  if (!categoryName) {
    await sendMessage(chatId, "Qual categoria você gostaria de consultar?");
    return;
  }

  // Only match against visible categories (respects privacy)
  const visibleCategories = getVisibleCategories(userContext.categories, userContext.privacyMode, userContext.memberId);
  const match = matchCategory(categoryName, visibleCategories);

  if (!match) {
    await sendMessage(
      chatId,
      `Não encontrei a categoria "${categoryName}".\n\n` +
        `Categorias disponíveis:\n` +
        visibleCategories.map((c) => `- ${c.name}`).join("\n")
    );
    return;
  }

  const categoryInfo = await getCategoryInfo(budgetId, match.category.id, year, month);

  const message = formatCategoryMessage({
    categoryName: match.category.name,
    categoryIcon: match.category.icon || null,
    categoryInfo,
    year,
    month,
    formatCurrency,
  });

  await sendMessage(chatId, message);
}

/**
 * Handle goal query - show goal progress
 */
async function handleGoalQuery(
  chatId: number,
  goalName: string | undefined,
  userContext: UserContext
): Promise<void> {
  // Apply privacy filtering to goals
  const visibleGoals = getVisibleGoals(userContext.goals, userContext.privacyMode, userContext.memberId);

  if (!goalName && visibleGoals.length === 0) {
    await sendMessage(chatId, "Você ainda não tem metas cadastradas.");
    return;
  }

  // If no specific goal mentioned, show all visible goals
  if (!goalName) {
    const message = formatGoalsListMessage(visibleGoals, formatCurrency);
    await sendMessage(chatId, message);
    return;
  }

  // Try to match the goal (only against visible ones)
  const match = matchGoal(goalName, visibleGoals);

  if (!match) {
    await sendMessage(
      chatId,
      `Não encontrei a meta "${goalName}".\n\n` +
        `Suas metas:\n` +
        visibleGoals.map((g) => `- ${g.name}`).join("\n")
    );
    return;
  }

  const message = formatGoalMessage(match.goal, formatCurrency);
  await sendMessage(chatId, message);
}

/**
 * Handle account query - show specific account balance
 */
async function handleAccountQuery(
  chatId: number,
  accountName: string | undefined,
  userContext: UserContext
): Promise<void> {
  if (!accountName && userContext.accounts.length === 0) {
    await sendMessage(chatId, "Você ainda não tem contas cadastradas.");
    return;
  }

  // If no specific account mentioned, show all accounts
  if (!accountName) {
    const accountsList = await getAccountsList(userContext.budgetId);
    const message = formatAccountsListMessage(accountsList, formatCurrency);
    await sendMessage(chatId, message);
    return;
  }

  // Try to match the account
  const match = matchAccount(accountName, userContext.accounts);

  if (!match) {
    await sendMessage(
      chatId,
      `Não encontrei a conta "${accountName}".\n\n` +
        `Suas contas:\n` +
        userContext.accounts.map((a) => `- ${a.name}`).join("\n")
    );
    return;
  }

  // Get full account details
  const account = await getAccountById(match.account.id);

  if (!account) {
    await sendMessage(chatId, "Conta não encontrada.");
    return;
  }

  const message = formatAccountMessage(account, formatCurrency);
  await sendMessage(chatId, message);
}
