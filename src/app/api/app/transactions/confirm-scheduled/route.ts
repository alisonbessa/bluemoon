import withAuthRequired from "@/shared/lib/auth/withAuthRequired";
import { db } from "@/db";
import { transactions } from "@/db/schema";
import { eq, and, gte, lte } from "drizzle-orm";
import { getUserBudgetIds } from "@/shared/lib/api/permissions";
import {
  validationError,
  forbiddenError,
  successResponse,
  errorResponse,
} from "@/shared/lib/api/responses";
import { z } from "zod";

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
    // Update the existing pending transaction to cleared
    const [updated] = await db
      .update(transactions)
      .set({
        status: "cleared",
        amount, // Update amount in case it changed
        description: description || existingPending.description,
        accountId,
        updatedAt: new Date(),
      })
      .where(eq(transactions.id, existingPending.id))
      .returning();

    return successResponse({
      transaction: updated,
      action: "updated",
      message: "Transação pendente atualizada para confirmada",
    });
  } else {
    // No pending transaction found, create a new one
    const [created] = await db
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
      })
      .returning();

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
