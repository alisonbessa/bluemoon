import withAuthRequired from "@/lib/auth/withAuthRequired";
import { db } from "@/db";
import { budgetMembers, categories, groups, incomeSources, transactions, monthlyAllocations } from "@/db/schema";
import { eq, and, gte, lte, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";

// Helper to get user's budget IDs
async function getUserBudgetIds(userId: string) {
  const memberships = await db
    .select({ budgetId: budgetMembers.budgetId })
    .from(budgetMembers)
    .where(eq(budgetMembers.userId, userId));
  return memberships.map((m) => m.budgetId);
}

interface ScheduledTransaction {
  id: string;
  type: "expense" | "income";
  name: string;
  icon?: string | null;
  amount: number;
  dueDay: number;
  dueDate: string;
  isPaid: boolean;
  sourceType: "category" | "income_source";
  sourceId: string;
  categoryId?: string;
  incomeSourceId?: string;
}

// GET - Get scheduled/projected transactions for a month
export const GET = withAuthRequired(async (req, context) => {
  const { session } = context;
  const { searchParams } = new URL(req.url);
  const budgetId = searchParams.get("budgetId");
  const year = parseInt(searchParams.get("year") || new Date().getFullYear().toString());
  const month = parseInt(searchParams.get("month") || (new Date().getMonth() + 1).toString());

  if (!budgetId) {
    return NextResponse.json({ error: "budgetId is required" }, { status: 400 });
  }

  const budgetIds = await getUserBudgetIds(session.user.id);
  if (!budgetIds.includes(budgetId)) {
    return NextResponse.json({ error: "Budget not found or access denied" }, { status: 404 });
  }

  // Calculate date range for this month
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59);

  // Get categories with dueDay (fixed expenses)
  const [categoriesWithDueDay, incomeSourcesWithDay, existingTransactions] = await Promise.all([
    // Categories with dueDay set
    db
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
          eq(categories.isArchived, false)
        )
      ),

    // Income sources with dayOfMonth
    db
      .select()
      .from(incomeSources)
      .where(
        and(
          eq(incomeSources.budgetId, budgetId),
          eq(incomeSources.isActive, true)
        )
      ),

    // Get existing transactions for this month to check what's already paid
    db
      .select({
        categoryId: transactions.categoryId,
        incomeSourceId: transactions.incomeSourceId,
        status: transactions.status,
        amount: transactions.amount,
        type: transactions.type,
      })
      .from(transactions)
      .where(
        and(
          eq(transactions.budgetId, budgetId),
          gte(transactions.date, startDate),
          lte(transactions.date, endDate),
          inArray(transactions.status, ["pending", "cleared", "reconciled"])
        )
      ),
  ]);

  // Build map of already paid items
  const paidCategories = new Set<string>();
  const paidIncomeSources = new Set<string>();

  for (const tx of existingTransactions) {
    if (tx.categoryId && tx.type === "expense") {
      paidCategories.add(tx.categoryId);
    }
    if (tx.incomeSourceId && tx.type === "income") {
      paidIncomeSources.add(tx.incomeSourceId);
    }
  }

  const scheduledTransactions: ScheduledTransaction[] = [];

  // Add scheduled expenses from categories with dueDay
  for (const { category, group, allocation } of categoriesWithDueDay) {
    if (category.dueDay) {
      // Use allocation amount or planned amount
      const amount = allocation?.allocated || category.plannedAmount || 0;
      if (amount > 0) {
        const dueDate = new Date(year, month - 1, Math.min(category.dueDay, endDate.getDate()));

        scheduledTransactions.push({
          id: `expense-${category.id}-${year}-${month}`,
          type: "expense",
          name: category.name,
          icon: category.icon || group.icon,
          amount: amount,
          dueDay: category.dueDay,
          dueDate: dueDate.toISOString(),
          isPaid: paidCategories.has(category.id),
          sourceType: "category",
          sourceId: category.id,
          categoryId: category.id,
        });
      }
    }
  }

  // Add scheduled income from income sources
  for (const source of incomeSourcesWithDay) {
    if (source.dayOfMonth && source.amount > 0) {
      const dueDate = new Date(year, month - 1, Math.min(source.dayOfMonth, endDate.getDate()));

      scheduledTransactions.push({
        id: `income-${source.id}-${year}-${month}`,
        type: "income",
        name: source.name,
        icon: source.type === "salary" ? "💼" : source.type === "benefit" ? "🎁" : "💰",
        amount: source.amount,
        dueDay: source.dayOfMonth,
        dueDate: dueDate.toISOString(),
        isPaid: paidIncomeSources.has(source.id),
        sourceType: "income_source",
        sourceId: source.id,
        incomeSourceId: source.id,
      });
    }
  }

  // Sort by due day
  scheduledTransactions.sort((a, b) => a.dueDay - b.dueDay);

  // Calculate totals
  const totals = {
    expenses: scheduledTransactions
      .filter((t) => t.type === "expense")
      .reduce((sum, t) => sum + t.amount, 0),
    income: scheduledTransactions
      .filter((t) => t.type === "income")
      .reduce((sum, t) => sum + t.amount, 0),
    paidExpenses: scheduledTransactions
      .filter((t) => t.type === "expense" && t.isPaid)
      .reduce((sum, t) => sum + t.amount, 0),
    paidIncome: scheduledTransactions
      .filter((t) => t.type === "income" && t.isPaid)
      .reduce((sum, t) => sum + t.amount, 0),
  };

  return NextResponse.json({
    year,
    month,
    scheduledTransactions,
    totals,
  });
});
