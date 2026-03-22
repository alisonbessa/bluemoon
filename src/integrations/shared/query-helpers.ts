import { db } from "@/db";
import { transactions, categories, monthlyAllocations, financialAccounts } from "@/db/schema";
import { eq, and, gte, lte, sum } from "drizzle-orm";

// ============================================
// Shared interfaces
// ============================================

export interface CategorySummary {
  categoryId: string;
  categoryName: string;
  categoryIcon: string | null;
  allocated: number;
  spent: number;
  remaining: number;
}

export interface MonthSummary {
  totalIncome: number;
  totalExpenses: number;
  balance: number;
  topCategories: CategorySummary[];
  myExpenses: number;
  myIncome: number;
}

// ============================================
// Privacy helpers
// ============================================

/**
 * Check if a category belongs to another member (privacy-relevant)
 */
export function isOtherMemberCategory(
  category: { memberId?: string | null },
  userMemberId: string
): boolean {
  return category.memberId != null && category.memberId !== userMemberId;
}

/**
 * Get visible categories respecting privacy mode
 */
export function getVisibleCategories<
  T extends { id: string; name: string; memberId?: string | null }
>(
  categories: T[],
  privacyMode: string | undefined,
  memberId: string
): T[] {
  if (privacyMode === "private") {
    return categories.filter((c) => !isOtherMemberCategory(c, memberId));
  }
  return categories;
}

/**
 * Get visible goals respecting privacy mode
 */
export function getVisibleGoals<
  T extends { id: string; name: string; memberId?: string | null }
>(
  goals: T[],
  privacyMode: string | undefined,
  memberId: string
): T[] {
  if (privacyMode === "private") {
    return goals.filter((g) => g.memberId == null || g.memberId === memberId);
  }
  // "unified": show all goals with real amounts (like Solo)
  // Only individual transaction details are hidden in unified mode
  return goals;
}

// ============================================
// Account helpers
// ============================================

/**
 * Get icon for account type
 */
export function getAccountIcon(type: string): string {
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

// ============================================
// Database query helpers
// ============================================

/**
 * Get month summary with income, expenses, and top categories.
 * When memberId is provided, also returns individual member's expenses/income.
 */
export async function getMonthSummary(
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
    (acc: number, cat: { spent: string | null }) => acc + (Number(cat.spent) || 0),
    0
  );

  // Sort by spent amount
  const topCategories: CategorySummary[] = expensesByCategory
    .map((cat: { categoryId: string | null; categoryName: string | null; categoryIcon: string | null; spent: string | null }) => ({
      categoryId: cat.categoryId || "",
      categoryName: cat.categoryName || "Sem categoria",
      categoryIcon: cat.categoryIcon,
      allocated: 0,
      spent: Number(cat.spent) || 0,
      remaining: 0,
    }))
    .sort((a: CategorySummary, b: CategorySummary) => b.spent - a.spent);

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
export async function getCategoryInfo(
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

/**
 * Get all financial accounts for a budget
 */
export async function getAccountsList(budgetId: string) {
  return db
    .select()
    .from(financialAccounts)
    .where(eq(financialAccounts.budgetId, budgetId));
}

/**
 * Get a single financial account by ID
 */
export async function getAccountById(accountId: string) {
  const [account] = await db
    .select()
    .from(financialAccounts)
    .where(eq(financialAccounts.id, accountId));
  return account;
}
