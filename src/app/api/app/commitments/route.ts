import withAuthRequired from "@/lib/auth/withAuthRequired";
import { db } from "@/db";
import { budgetMembers, categories, groups, monthlyAllocations, transactions } from "@/db/schema";
import { eq, and, gte, lte, isNotNull, inArray, sql } from "drizzle-orm";
import { NextResponse } from "next/server";

// Helper to get user's budget IDs
async function getUserBudgetIds(userId: string) {
  const memberships = await db
    .select({ budgetId: budgetMembers.budgetId })
    .from(budgetMembers)
    .where(eq(budgetMembers.userId, userId));
  return memberships.map((m) => m.budgetId);
}

// GET - Get upcoming commitments (categories with targetDate in the next 30 days)
export const GET = withAuthRequired(async (req, context) => {
  const { session } = context;
  const { searchParams } = new URL(req.url);
  const budgetId = searchParams.get("budgetId");
  const daysAhead = parseInt(searchParams.get("days") || "30");

  if (!budgetId) {
    return NextResponse.json({ error: "budgetId is required" }, { status: 400 });
  }

  const budgetIds = await getUserBudgetIds(session.user.id);
  if (!budgetIds.includes(budgetId)) {
    return NextResponse.json({ error: "Budget not found or access denied" }, { status: 404 });
  }

  const now = new Date();
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + daysAhead);

  // Get categories with targetDate in the upcoming period
  const upcomingCommitments = await db
    .select({
      category: categories,
      group: groups,
    })
    .from(categories)
    .innerJoin(groups, eq(categories.groupId, groups.id))
    .where(
      and(
        eq(categories.budgetId, budgetId),
        eq(categories.isArchived, false),
        isNotNull(categories.targetDate),
        gte(categories.targetDate, now),
        lte(categories.targetDate, futureDate)
      )
    )
    .orderBy(categories.targetDate);

  // Get current month's allocations and spending for these categories
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const categoryIds = upcomingCommitments.map((c) => c.category.id);

  // Calculate date range for this month
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59);

  const [allocations, spending] = await Promise.all([
    // Get allocations
    categoryIds.length > 0
      ? db
          .select()
          .from(monthlyAllocations)
          .where(
            and(
              eq(monthlyAllocations.budgetId, budgetId),
              eq(monthlyAllocations.year, year),
              eq(monthlyAllocations.month, month)
            )
          )
      : [],
    // Get spending per category
    categoryIds.length > 0
      ? db
          .select({
            categoryId: transactions.categoryId,
            totalSpent: sql<number>`SUM(CASE WHEN ${transactions.type} = 'expense' THEN ${transactions.amount} ELSE 0 END)`,
          })
          .from(transactions)
          .where(
            and(
              eq(transactions.budgetId, budgetId),
              gte(transactions.date, startDate),
              lte(transactions.date, endDate),
              inArray(transactions.status, ["pending", "cleared", "reconciled"]),
              inArray(transactions.categoryId, categoryIds)
            )
          )
          .groupBy(transactions.categoryId)
      : [],
  ]);

  const allocationsMap = new Map(allocations.map((a) => [a.categoryId, a.allocated || 0]));
  const spendingMap = new Map(spending.map((s) => [s.categoryId, Number(s.totalSpent) || 0]));

  // Filter to show only unpaid commitments (spent < allocated or allocated === 0 with plannedAmount > 0)
  const commitments = upcomingCommitments
    .map(({ category, group }) => {
      const allocated = allocationsMap.get(category.id) || category.plannedAmount || 0;
      const spent = spendingMap.get(category.id) || 0;

      return {
        id: category.id,
        name: category.name,
        icon: category.icon,
        targetDate: category.targetDate,
        allocated,
        spent,
        isPaid: allocated > 0 && spent >= allocated,
        group: {
          id: group.id,
          name: group.name,
          code: group.code,
        },
      };
    })
    .filter((c) => !c.isPaid); // Only show unpaid commitments

  return NextResponse.json({
    commitments,
    period: {
      from: now.toISOString(),
      to: futureDate.toISOString(),
      days: daysAhead,
    },
  });
});
