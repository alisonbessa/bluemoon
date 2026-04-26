import withAuthRequired from "@/shared/lib/auth/withAuthRequired";
import { requireActiveSubscription } from "@/shared/lib/auth/withSubscriptionRequired";
import { db } from "@/db";
import { transactions, categories, incomeSources, financialAccounts } from "@/db/schema";
import { eq, and, gte, lte } from "drizzle-orm";
import { getUserBudgetIds, getUserMemberIdInBudget } from "@/shared/lib/api/permissions";
import {
  validationError,
  forbiddenError,
  successResponse,
  errorResponse,
} from "@/shared/lib/api/responses";
import { z } from "zod";
import { getScopeFromCategory, getScopeFromIncomeSource } from "@/shared/lib/transactions/scope";
import { applyTransactionBalanceChange } from "@/shared/lib/transactions/installments";

const confirmScheduledSchema = z.object({
  budgetId: z.string().uuid(),
  type: z.enum(["income", "expense"]),
  amount: z.number().int().positive(),
  description: z.string().optional(),
  accountId: z.string().uuid(),
  categoryId: z.string().uuid().optional(),
  incomeSourceId: z.string().uuid().optional(),
  recurringBillId: z.string().uuid().optional(),
  date: z.string(), // ISO date string
});

/**
 * POST /api/app/transactions/confirm-scheduled
 *
 * Confirms a scheduled transaction by either:
 * 1. Updating an existing pending transaction to "cleared" status, OR
 * 2. Creating a new transaction if no pending one exists
 *
 * This prevents duplicate transactions when both pending and manual transactions exist.
 */
export const POST = withAuthRequired(async (req, context) => {
  const { session } = context;

  const subscriptionError = await requireActiveSubscription(session.user.id);
  if (subscriptionError) return subscriptionError;

  const body = await req.json();

  const validation = confirmScheduledSchema.safeParse(body);
  if (!validation.success) {
    return validationError(validation.error);
  }

  const {
    budgetId,
    type,
    amount,
    description,
    accountId,
    categoryId,
    incomeSourceId,
    recurringBillId,
    date,
  } = validation.data;

  // Check user has access to budget
  const budgetIds = await getUserBudgetIds(session.user.id);
  if (!budgetIds.includes(budgetId)) {
    return forbiddenError("Budget not found or access denied");
  }

  // Get user's member ID for paidByMemberId
  const currentMemberId = await getUserMemberIdInBudget(session.user.id, budgetId);
  if (!currentMemberId) {
    return forbiddenError("Member not found in budget");
  }

  // Validate accountId belongs to this budget
  const [accountRow] = await db
    .select({ id: financialAccounts.id })
    .from(financialAccounts)
    .where(
      and(
        eq(financialAccounts.id, accountId),
        eq(financialAccounts.budgetId, budgetId)
      )
    );
  if (!accountRow) {
    return errorResponse("Account does not belong to this budget", 400);
  }

  // Derive scope (memberId) from category or income source. Both must belong
  // to the same budget — silently falling back to currentMemberId when an FK
  // is bogus would let callers attach transactions to the wrong scope.
  let scopeMemberId: string | null = currentMemberId;
  if (type === "expense" && categoryId) {
    const [cat] = await db
      .select({ id: categories.id, memberId: categories.memberId })
      .from(categories)
      .where(
        and(
          eq(categories.id, categoryId),
          eq(categories.budgetId, budgetId)
        )
      )
      .limit(1);
    if (!cat) {
      return errorResponse("Category does not belong to this budget", 400);
    }
    if (cat.memberId !== null && cat.memberId !== currentMemberId) {
      return forbiddenError("Category belongs to another member");
    }
    scopeMemberId = getScopeFromCategory(categoryId, [cat], currentMemberId);
  } else if (type === "income" && incomeSourceId) {
    const [source] = await db
      .select({ id: incomeSources.id, memberId: incomeSources.memberId })
      .from(incomeSources)
      .where(
        and(
          eq(incomeSources.id, incomeSourceId),
          eq(incomeSources.budgetId, budgetId)
        )
      )
      .limit(1);
    if (!source) {
      return errorResponse("Income source does not belong to this budget", 400);
    }
    scopeMemberId = getScopeFromIncomeSource(incomeSourceId, [source], currentMemberId);
  }

  const transactionDate = new Date(date);

  // Calculate date range for the same day (to find existing pending transaction)
  const startOfDay = new Date(transactionDate);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(transactionDate);
  endOfDay.setHours(23, 59, 59, 999);

  // Look for an existing pending transaction that matches this scheduled item
  // We match by: type + (incomeSourceId OR recurringBillId) + date range + status=pending
  let existingPending = null;

  if (incomeSourceId) {
    const [found] = await db
      .select()
      .from(transactions)
      .where(
        and(
          eq(transactions.budgetId, budgetId),
          eq(transactions.type, type),
          eq(transactions.incomeSourceId, incomeSourceId),
          eq(transactions.status, "pending"),
          gte(transactions.date, startOfDay),
          lte(transactions.date, endOfDay)
        )
      )
      .limit(1);
    existingPending = found;
  } else if (recurringBillId) {
    const [found] = await db
      .select()
      .from(transactions)
      .where(
        and(
          eq(transactions.budgetId, budgetId),
          eq(transactions.type, type),
          eq(transactions.recurringBillId, recurringBillId),
          eq(transactions.status, "pending"),
          gte(transactions.date, startOfDay),
          lte(transactions.date, endOfDay)
        )
      )
      .limit(1);
    existingPending = found;
  }

  if (existingPending) {
    // Update the existing pending transaction to cleared, atomically applying
    // the balance delta. Lazy-generated pending transactions intentionally do
    // not move balance until they are confirmed (see pending-transactions.ts),
    // so the full amount must be debited/credited here.
    const updated = await db.transaction(async (tx) => {
      // Lazy-generated pending rows never moved the account balance, so
      // confirming applies the full amount on the (possibly new) account.
      // No reversal is needed on the old account when accountId changes.
      await applyTransactionBalanceChange(tx, {
        accountId,
        type: existingPending.type as "income" | "expense" | "transfer",
        amount,
        status: "cleared",
      });

      const [row] = await tx
        .update(transactions)
        .set({
          status: "cleared",
          amount,
          description: description || existingPending.description,
          accountId,
          memberId: scopeMemberId,
          paidByMemberId: currentMemberId,
          updatedAt: new Date(),
        })
        .where(eq(transactions.id, existingPending.id))
        .returning();

      return row;
    });

    return successResponse({
      transaction: updated,
      action: "updated",
      message: "Transação pendente atualizada para confirmada",
    });
  } else {
    // No pending transaction found, create a new cleared one and move balance.
    const created = await db.transaction(async (tx) => {
      const [row] = await tx
        .insert(transactions)
        .values({
          budgetId,
          type,
          amount,
          description,
          accountId,
          categoryId,
          incomeSourceId,
          recurringBillId,
          date: transactionDate,
          status: "cleared",
          source: "manual",
          memberId: scopeMemberId,
          paidByMemberId: currentMemberId,
        })
        .returning();

      await applyTransactionBalanceChange(tx, {
        accountId: row.accountId,
        type,
        amount: row.amount,
        status: "cleared",
      });

      return row;
    });

    return successResponse(
      {
        transaction: created,
        action: "created",
        message: "Nova transação criada",
      },
      201
    );
  }
});
