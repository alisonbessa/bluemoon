import withAuthRequired from "@/shared/lib/auth/withAuthRequired";
import { db } from "@/db";
import { transactions, financialAccounts, categories } from "@/db/schema";
import { eq, and, inArray, gte, lte, isNotNull, isNull, sql } from "drizzle-orm";
import { getUserBudgetIds } from "@/shared/lib/api/permissions";
import { forbiddenError, successResponse, errorResponse } from "@/shared/lib/api/responses";

/**
 * GET /api/app/dashboard/shared-balance/details
 *
 * Returns individual shared expense transactions paid from personal accounts,
 * grouped by payer. Used to show the breakdown in the settlement details modal.
 */
export const GET = withAuthRequired(async (req, context) => {
  const { session } = context;
  const { searchParams } = new URL(req.url);

  const budgetId = searchParams.get("budgetId");
  const year = parseInt(searchParams.get("year") || new Date().getFullYear().toString());
  const month = parseInt(searchParams.get("month") || (new Date().getMonth() + 1).toString());

  if (!budgetId) return errorResponse("budgetId is required", 400);

  const budgetIds = await getUserBudgetIds(session.user.id);
  if (!budgetIds.includes(budgetId)) return forbiddenError("Budget not found");

  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59);

  const results = await db
    .select({
      id: transactions.id,
      amount: transactions.amount,
      description: transactions.description,
      date: transactions.date,
      paidByMemberId: transactions.paidByMemberId,
      categoryName: categories.name,
      categoryIcon: categories.icon,
      accountName: financialAccounts.name,
    })
    .from(transactions)
    .innerJoin(categories, eq(transactions.categoryId, categories.id))
    .innerJoin(financialAccounts, eq(transactions.accountId, financialAccounts.id))
    .where(
      and(
        eq(transactions.budgetId, budgetId),
        eq(transactions.type, "expense"),
        inArray(transactions.status, ["cleared", "reconciled"]),
        gte(transactions.date, startDate),
        lte(transactions.date, endDate),
        isNull(categories.memberId), // Shared category
        isNotNull(transactions.paidByMemberId), // Has a payer
        isNotNull(financialAccounts.ownerId) // Personal account (not shared)
      )
    )
    .orderBy(transactions.date);

  return successResponse({ transactions: results });
});
