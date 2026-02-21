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
import { eq, and, gte, lte } from "drizzle-orm";
import type { UserContext, BudgetInfo } from "./types";

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

  const [budgetAccounts, budgetCategories, budgetIncomeSources, budgetGoals, pendingTxs] = await Promise.all([
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
    pendingTransactions: budgetInfo.pendingTransactions,
    defaultAccountId: budgetInfo.defaultAccount?.id,
    memberId: budgetInfo.member.id,
  };
}
