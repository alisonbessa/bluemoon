import withAuthRequired from "@/shared/lib/auth/withAuthRequired";
import { requireActiveSubscription } from "@/shared/lib/auth/withSubscriptionRequired";
import { withRateLimit, rateLimits } from "@/shared/lib/security/rate-limit";
import { db } from "@/db";
import { transactions, financialAccounts, budgetMembers } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { getUserBudgetIds, getUserMemberIdInBudget } from "@/shared/lib/api/permissions";
import {
  forbiddenError,
  successResponse,
  errorResponse,
  validationError,
} from "@/shared/lib/api/responses";
import { z } from "zod";

const settleSchema = z.object({
  budgetId: z.string().uuid(),
  fromAccountId: z.string().uuid(),
  toAccountId: z.string().uuid(),
  amount: z.number().int().min(1),
  year: z.number().int(),
  month: z.number().int().min(1).max(12),
});

// POST - Create a settlement transfer between members
export const POST = withRateLimit(withAuthRequired(async (req, context) => {
  const { session } = context;

  const subscriptionError = await requireActiveSubscription(session.user.id);
  if (subscriptionError) return subscriptionError;

  const body = await req.json();
  const validation = settleSchema.safeParse(body);
  if (!validation.success) {
    return validationError(validation.error);
  }

  const { budgetId, fromAccountId, toAccountId, amount, year, month } = validation.data;

  // Check user has access to budget
  const budgetIds = await getUserBudgetIds(session.user.id);
  if (!budgetIds.includes(budgetId)) {
    return forbiddenError("Budget not found or access denied");
  }

  // Validate both accounts belong to the budget and are personal accounts
  const [fromAccount] = await db
    .select()
    .from(financialAccounts)
    .where(
      and(
        eq(financialAccounts.id, fromAccountId),
        eq(financialAccounts.budgetId, budgetId)
      )
    );

  const [toAccount] = await db
    .select()
    .from(financialAccounts)
    .where(
      and(
        eq(financialAccounts.id, toAccountId),
        eq(financialAccounts.budgetId, budgetId)
      )
    );

  if (!fromAccount || !toAccount) {
    return errorResponse("One or both accounts not found in this budget", 400);
  }

  const userMemberId = await getUserMemberIdInBudget(session.user.id, budgetId);

  // Create transfer transaction and update balances atomically
  const newTransaction = await db.transaction(async (tx) => {
    const [created] = await tx
      .insert(transactions)
      .values({
        budgetId,
        accountId: fromAccountId,
        toAccountId,
        memberId: userMemberId,
        paidByMemberId: userMemberId!,
        type: "transfer",
        status: "cleared",
        amount,
        description: `Acerto do mês - ${String(month).padStart(2, "0")}/${year}`,
        date: new Date(),
        source: "web",
      })
      .returning();

    // Debit from source account
    await tx
      .update(financialAccounts)
      .set({
        balance: sql`${financialAccounts.balance} - ${amount}`,
        updatedAt: new Date(),
      })
      .where(eq(financialAccounts.id, fromAccountId));

    // Credit to destination account
    await tx
      .update(financialAccounts)
      .set({
        balance: sql`${financialAccounts.balance} + ${amount}`,
        updatedAt: new Date(),
      })
      .where(eq(financialAccounts.id, toAccountId));

    return created;
  });

  return successResponse({ transaction: newTransaction }, 201);
}), rateLimits.api, "settle-shared-balance");
