import { db } from "@/db";
import {
  categories,
  groups,
  incomeSources,
  transactions,
  monthlyAllocations,
  financialAccounts,
} from "@/db/schema";
import { eq, and, gte, lte, isNotNull } from "drizzle-orm";

interface EnsureResult {
  created: number;
  expenses: number;
  income: number;
  alreadyExisted: boolean;
}

/**
 * Ensure pending transactions exist for a given month.
 * This implements "lazy generation" - transactions are created on-demand
 * when queried, rather than requiring a manual "start month" action.
 *
 * @param budgetId - The budget ID
 * @param year - The year (e.g., 2026)
 * @param month - The month (1-12)
 * @returns Information about what was created
 */
export async function ensurePendingTransactionsForMonth(
  budgetId: string,
  year: number,
  month: number
): Promise<EnsureResult> {
  // Calculate date range for this month
  const startDate = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0));
  const lastDayOfMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const endDate = new Date(Date.UTC(year, month - 1, lastDayOfMonth, 23, 59, 59));

  // Check existing transactions for this month
  const existingTransactions = await db
    .select({
      categoryId: transactions.categoryId,
      incomeSourceId: transactions.incomeSourceId,
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.budgetId, budgetId),
        gte(transactions.date, startDate),
        lte(transactions.date, endDate)
      )
    );

  const existingCategoryIds = new Set(
    existingTransactions.filter((t) => t.categoryId).map((t) => t.categoryId)
  );
  const existingIncomeIds = new Set(
    existingTransactions.filter((t) => t.incomeSourceId).map((t) => t.incomeSourceId)
  );

  // Get all categories with dueDay
  const categoriesWithDueDay = await db
    .select({
      category: categories,
      group: groups,
      allocation: monthlyAllocations,
    })
    .from(categories)
    .innerJoin(groups, eq(categories.groupId, groups.id))
    .leftJoin(
      monthlyAllocations,
      and(
        eq(monthlyAllocations.categoryId, categories.id),
        eq(monthlyAllocations.year, year),
        eq(monthlyAllocations.month, month)
      )
    )
    .where(
      and(
        eq(categories.budgetId, budgetId),
        eq(categories.isArchived, false),
        isNotNull(categories.dueDay)
      )
    );

  // Get income sources with dayOfMonth
  const incomeSourcesWithDay = await db
    .select({
      incomeSource: incomeSources,
      account: financialAccounts,
    })
    .from(incomeSources)
    .leftJoin(financialAccounts, eq(incomeSources.accountId, financialAccounts.id))
    .where(
      and(
        eq(incomeSources.budgetId, budgetId),
        eq(incomeSources.isActive, true),
        isNotNull(incomeSources.dayOfMonth)
      )
    );

  // Get default account for transactions without specific account
  const defaultAccount = await db
    .select()
    .from(financialAccounts)
    .where(eq(financialAccounts.budgetId, budgetId))
    .limit(1);

  if (defaultAccount.length === 0) {
    return { created: 0, expenses: 0, income: 0, alreadyExisted: true };
  }

  // Create pending expense transactions (only for categories not yet in this month)
  const expenseTransactions = [];
  for (const { category, allocation } of categoriesWithDueDay) {
    if (existingCategoryIds.has(category.id)) continue;

    const amount = allocation?.allocated || category.plannedAmount || 0;
    if (amount <= 0) continue;

    const dueDay = Math.min(category.dueDay!, lastDayOfMonth);
    const dueDate = new Date(Date.UTC(year, month - 1, dueDay, 12, 0, 0)); // Noon UTC to avoid timezone issues

    expenseTransactions.push({
      budgetId,
      accountId: defaultAccount[0].id,
      categoryId: category.id,
      type: "expense" as const,
      status: "pending" as const,
      amount: amount,
      description: `${category.name} (agendado)`,
      date: dueDate,
      source: "scheduled",
    });
  }

  // Create pending income transactions (only for sources not yet in this month)
  const incomeTransactions = [];
  for (const { incomeSource, account } of incomeSourcesWithDay) {
    if (existingIncomeIds.has(incomeSource.id)) continue;

    if (incomeSource.amount <= 0) continue;

    const dueDay = Math.min(incomeSource.dayOfMonth!, lastDayOfMonth);
    const dueDate = new Date(Date.UTC(year, month - 1, dueDay, 12, 0, 0)); // Noon UTC to avoid timezone issues

    incomeTransactions.push({
      budgetId,
      accountId: account?.id || defaultAccount[0].id,
      incomeSourceId: incomeSource.id,
      type: "income" as const,
      status: "pending" as const,
      amount: incomeSource.amount,
      description: `${incomeSource.name} (agendado)`,
      date: dueDate,
      source: "scheduled",
    });
  }

  // Insert all new transactions
  const allTransactions = [...expenseTransactions, ...incomeTransactions];

  if (allTransactions.length > 0) {
    await db.insert(transactions).values(allTransactions);
  }

  return {
    created: allTransactions.length,
    expenses: expenseTransactions.length,
    income: incomeTransactions.length,
    alreadyExisted: allTransactions.length === 0,
  };
}

/**
 * Get or create pending transactions for the current month.
 * This is a convenience wrapper around ensurePendingTransactionsForMonth.
 */
export async function ensureCurrentMonthTransactions(budgetId: string): Promise<EnsureResult> {
  const now = new Date();
  return ensurePendingTransactionsForMonth(
    budgetId,
    now.getFullYear(),
    now.getMonth() + 1
  );
}
