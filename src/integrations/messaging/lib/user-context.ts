import { db } from "@/db";
import {
  transactions,
  categories,
  budgetMembers,
  financialAccounts,
  budgets,
  groups,
  incomeSources,
  goals,
} from "@/db/schema";
import { eq, and, gte, lte, inArray, sql } from "drizzle-orm";
import { monthlyAllocations } from "@/db/schema";
import type { UserContext, BudgetInfo } from "./types";
import { formatCurrency } from "@/shared/lib/formatters";

// Get user's default budget, accounts, categories, income sources, goals, and pending transactions
export async function getUserBudgetInfo(userId: string): Promise<BudgetInfo | null> {
  // Get user's first budget
  const membership = await db
    .select({
      budget: budgets,
      member: budgetMembers,
    })
    .from(budgetMembers)
    .innerJoin(budgets, eq(budgetMembers.budgetId, budgets.id))
    .where(eq(budgetMembers.userId, userId))
    .limit(1);

  if (membership.length === 0) return null;

  const budgetId = membership[0].budget.id;

  // Run all queries in parallel
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  const [budgetAccounts, budgetCategories, budgetIncomeSources, budgetGoals, pendingTxs, allMembers] = await Promise.all([
    db.select().from(financialAccounts).where(eq(financialAccounts.budgetId, budgetId)),

    db.select({ category: categories, group: groups })
      .from(categories)
      .innerJoin(groups, eq(categories.groupId, groups.id))
      .where(and(eq(categories.budgetId, budgetId), eq(categories.isArchived, false))),

    db.select().from(incomeSources)
      .where(and(eq(incomeSources.budgetId, budgetId), eq(incomeSources.isActive, true))),

    db.select().from(goals)
      .where(and(eq(goals.budgetId, budgetId), eq(goals.isArchived, false))),

    db.select({
      id: transactions.id, type: transactions.type, amount: transactions.amount,
      description: transactions.description, categoryId: transactions.categoryId,
      incomeSourceId: transactions.incomeSourceId,
    }).from(transactions).where(and(
      eq(transactions.budgetId, budgetId), eq(transactions.status, "pending"),
      gte(transactions.date, startOfMonth), lte(transactions.date, endOfMonth),
    )),

    db.select({
      id: budgetMembers.id,
      name: budgetMembers.name,
      type: budgetMembers.type,
    }).from(budgetMembers).where(eq(budgetMembers.budgetId, budgetId)),
  ]);

  // Get default account with fallback chain: checking > cash > credit_card > savings > any
  const defaultAccount =
    budgetAccounts.find((a) => a.type === "checking") ||
    budgetAccounts.find((a) => a.type === "cash") ||
    budgetAccounts.find((a) => a.type === "credit_card") ||
    budgetAccounts.find((a) => a.type === "savings") ||
    budgetAccounts[0];

  // Map pending transactions with category/income source names
  const pendingTransactions = pendingTxs.map((tx) => {
    const category = tx.categoryId
      ? budgetCategories.find((c) => c.category.id === tx.categoryId)
      : null;
    const incomeSource = tx.incomeSourceId
      ? budgetIncomeSources.find((s) => s.id === tx.incomeSourceId)
      : null;

    return {
      id: tx.id,
      type: tx.type as "income" | "expense",
      amount: tx.amount,
      description: tx.description,
      categoryName: category?.category.name || null,
      incomeSourceName: incomeSource?.name || null,
    };
  });

  return {
    budget: {
      id: membership[0].budget.id,
      name: membership[0].budget.name,
    },
    member: {
      id: membership[0].member.id,
      userId: membership[0].member.userId!,
    },
    defaultAccount: defaultAccount ? {
      id: defaultAccount.id,
      name: defaultAccount.name,
      type: defaultAccount.type,
    } : undefined,
    categories: budgetCategories.map((c) => ({
      id: c.category.id,
      name: c.category.name,
      icon: c.category.icon,
      groupName: c.group.name,
    })),
    incomeSources: budgetIncomeSources.map((s) => ({
      id: s.id,
      name: s.name,
      type: s.type,
    })),
    goals: budgetGoals.map((g) => ({
      id: g.id,
      name: g.name,
      icon: g.icon,
      targetAmount: g.targetAmount,
      currentAmount: g.currentAmount || 0,
    })),
    accounts: budgetAccounts.map((a) => ({
      id: a.id,
      name: a.name,
      type: a.type,
      closingDay: a.closingDay,
    })),
    members: allMembers.map((m) => ({
      id: m.id,
      name: m.name,
      type: m.type,
    })),
    pendingTransactions,
  };
}

// Build user context for AI parsing
export function buildUserContext(userId: string, budgetInfo: BudgetInfo): UserContext {
  const now = new Date();
  return {
    userId,
    budgetId: budgetInfo.budget.id,
    currentMonth: now.getMonth() + 1,
    currentYear: now.getFullYear(),
    categories: budgetInfo.categories,
    incomeSources: budgetInfo.incomeSources,
    goals: budgetInfo.goals,
    accounts: budgetInfo.accounts,
    members: budgetInfo.members,
    pendingTransactions: budgetInfo.pendingTransactions,
    defaultAccountId: budgetInfo.defaultAccount?.id,
    memberId: budgetInfo.member.id,
  };
}

/**
 * Get the balance summary for a category in the current month.
 * Returns a formatted line like: "📊 Saldo: R$ 210,12 / R$ 450,00"
 */
export async function getCategoryBalanceSummary(
  budgetId: string,
  categoryId: string
): Promise<string> {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const startOfMonth = new Date(year, month - 1, 1);
  const endOfMonth = new Date(year, month, 0, 23, 59, 59);

  const [allocationResult, spentResult, categoryResult] = await Promise.all([
    db
      .select({
        allocated: monthlyAllocations.allocated,
        carriedOver: monthlyAllocations.carriedOver,
      })
      .from(monthlyAllocations)
      .where(
        and(
          eq(monthlyAllocations.budgetId, budgetId),
          eq(monthlyAllocations.categoryId, categoryId),
          eq(monthlyAllocations.year, year),
          eq(monthlyAllocations.month, month)
        )
      )
      .limit(1),

    db
      .select({
        total: sql<number>`COALESCE(SUM(${transactions.amount}), 0)`,
      })
      .from(transactions)
      .where(
        and(
          eq(transactions.budgetId, budgetId),
          eq(transactions.categoryId, categoryId),
          eq(transactions.type, "expense"),
          inArray(transactions.status, ["cleared", "reconciled"]),
          gte(transactions.date, startOfMonth),
          lte(transactions.date, endOfMonth)
        )
      ),

    db
      .select({ plannedAmount: categories.plannedAmount })
      .from(categories)
      .where(eq(categories.id, categoryId))
      .limit(1),
  ]);

  const spent = Number(spentResult[0]?.total) || 0;

  // Determine allocated: monthly allocation > category plannedAmount > 0
  let allocated = 0;
  if (allocationResult.length > 0) {
    allocated = (allocationResult[0].allocated || 0) + (allocationResult[0].carriedOver || 0);
  } else if (categoryResult[0]?.plannedAmount) {
    allocated = categoryResult[0].plannedAmount;
  }

  if (allocated > 0) {
    const remaining = allocated - spent;
    if (remaining < 0) {
      return `🔴 Saldo: ${formatCurrency(remaining)} / ${formatCurrency(allocated)}`;
    }
    return `📊 Saldo: ${formatCurrency(remaining)} / ${formatCurrency(allocated)}`;
  }

  // No allocation — just show total spent in the month
  return `📊 Total no mês: ${formatCurrency(spent)}`;
}
