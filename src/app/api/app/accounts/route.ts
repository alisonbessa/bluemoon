import withAuthRequired from "@/shared/lib/auth/withAuthRequired";
import { db } from "@/db";
import { financialAccounts, budgetMembers, transactions } from "@/db/schema";
import { eq, and, inArray, or, isNull, gte, lte, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { capitalizeWords } from "@/shared/lib/utils";
import {
  getUserBudgetIds,
  getUserMemberIdInBudget,
} from "@/shared/lib/api/permissions";
import {
  validationError,
  forbiddenError,
  cachedResponse,
  successResponse,
} from "@/shared/lib/api/responses";
import { createAccountSchema } from "@/shared/lib/validations/account.schema";
import { getBillingCycleDates } from "@/shared/lib/billing-cycle";

// GET - Get accounts for user's budgets
// Only returns accounts owned by the user OR shared accounts (ownerId is null)
export const GET = withAuthRequired(async (req, context) => {
  const { session } = context;
  const { searchParams } = new URL(req.url);
  const budgetId = searchParams.get("budgetId");

  const budgetIds = await getUserBudgetIds(session.user.id);

  if (budgetIds.length === 0) {
    return successResponse({ accounts: [] });
  }

  // Get user's member ID for visibility filtering
  const activeBudgetId = budgetId || budgetIds[0];
  const userMemberId = await getUserMemberIdInBudget(session.user.id, activeBudgetId);

  // Base condition: account belongs to user's budgets
  const budgetCondition = budgetId
    ? and(eq(financialAccounts.budgetId, budgetId), inArray(financialAccounts.budgetId, budgetIds))
    : inArray(financialAccounts.budgetId, budgetIds);

  // Visibility condition: owned by user OR shared (ownerId is null)
  const visibilityCondition = userMemberId
    ? or(eq(financialAccounts.ownerId, userMemberId), isNull(financialAccounts.ownerId))
    : isNull(financialAccounts.ownerId);

  const whereCondition = and(budgetCondition, visibilityCondition);

  const userAccounts = await db
    .select({
      id: financialAccounts.id,
      budgetId: financialAccounts.budgetId,
      ownerId: financialAccounts.ownerId,
      name: financialAccounts.name,
      type: financialAccounts.type,
      color: financialAccounts.color,
      icon: financialAccounts.icon,
      balance: financialAccounts.balance,
      clearedBalance: financialAccounts.clearedBalance,
      creditLimit: financialAccounts.creditLimit,
      closingDay: financialAccounts.closingDay,
      dueDay: financialAccounts.dueDay,
      isArchived: financialAccounts.isArchived,
      displayOrder: financialAccounts.displayOrder,
      createdAt: financialAccounts.createdAt,
      updatedAt: financialAccounts.updatedAt,
      owner: {
        id: budgetMembers.id,
        name: budgetMembers.name,
        type: budgetMembers.type,
        color: budgetMembers.color,
      },
    })
    .from(financialAccounts)
    .leftJoin(budgetMembers, eq(financialAccounts.ownerId, budgetMembers.id))
    .where(whereCondition);

  // Calculate currentBill for credit card accounts using billing cycle
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  const accountsWithBill = await Promise.all(
    userAccounts.map(async (account) => {
      if (account.type !== "credit_card" || !account.closingDay) {
        return { ...account, currentBill: null };
      }

      const { start, end } = getBillingCycleDates(account.closingDay, currentYear, currentMonth);

      const [result] = await db
        .select({ total: sql<number>`COALESCE(SUM(${transactions.amount}), 0)` })
        .from(transactions)
        .where(
          and(
            eq(transactions.accountId, account.id),
            eq(transactions.type, "expense"),
            gte(transactions.date, start),
            lte(transactions.date, end)
          )
        );

      return { ...account, currentBill: Number(result?.total || 0) };
    })
  );

  return cachedResponse({ accounts: accountsWithBill });
});

// POST - Create a new account
export const POST = withAuthRequired(async (req, context) => {
  const { session } = context;
  const body = await req.json();

  const validation = createAccountSchema.safeParse(body);
  if (!validation.success) {
    return validationError(validation.error);
  }

  const { budgetId, ...accountData } = validation.data;

  // Check user has access to budget
  const budgetIds = await getUserBudgetIds(session.user.id);
  if (!budgetIds.includes(budgetId)) {
    return forbiddenError("Budget not found or access denied");
  }

  // Get display order
  const existingAccounts = await db
    .select()
    .from(financialAccounts)
    .where(eq(financialAccounts.budgetId, budgetId));

  const [newAccount] = await db
    .insert(financialAccounts)
    .values({
      ...accountData,
      name: capitalizeWords(accountData.name),
      budgetId,
      displayOrder: existingAccounts.length,
    })
    .returning();

  return successResponse({ account: newAccount }, 201);
});
