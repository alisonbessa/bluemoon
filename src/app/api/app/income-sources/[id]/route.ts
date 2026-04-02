import withAuthRequired from "@/shared/lib/auth/withAuthRequired";
import { db } from "@/db";
import { incomeSources, transactions, financialAccounts } from "@/db/schema";
import { eq, and, inArray, gte, lte, sql } from "drizzle-orm";
import { capitalizeWords } from "@/shared/lib/utils";
import { getUserBudgetIds } from "@/shared/lib/api/permissions";
import {
  validationError,
  notFoundError,
  successResponse,
  errorResponse,
} from "@/shared/lib/api/responses";
import { updateIncomeSourceSchema, validateIncomeFrequencyFields } from "@/shared/lib/validations";

// GET - Get a specific income source
export const GET = withAuthRequired(async (req, context) => {
  const { session } = context;
  const params = await context.params;
  const sourceId = params.id as string;

  const budgetIds = await getUserBudgetIds(session.user.id);
  if (budgetIds.length === 0) {
    return notFoundError("Income source");
  }

  const [source] = await db
    .select()
    .from(incomeSources)
    .where(
      and(
        eq(incomeSources.id, sourceId),
        inArray(incomeSources.budgetId, budgetIds)
      )
    );

  if (!source) {
    return notFoundError("Income source");
  }

  return successResponse({ incomeSource: source });
});

// PATCH - Update an income source
export const PATCH = withAuthRequired(async (req, context) => {
  const { session } = context;
  const params = await context.params;
  const sourceId = params.id as string;
  const body = await req.json();

  const budgetIds = await getUserBudgetIds(session.user.id);
  if (budgetIds.length === 0) {
    return notFoundError("Income source");
  }

  const [existingSource] = await db
    .select()
    .from(incomeSources)
    .where(
      and(
        eq(incomeSources.id, sourceId),
        inArray(incomeSources.budgetId, budgetIds)
      )
    );

  if (!existingSource) {
    return notFoundError("Income source");
  }

  const validation = updateIncomeSourceSchema.safeParse(body);
  if (!validation.success) {
    return validationError(validation.error);
  }

  // Validate frequency-dependent fields
  // Use new frequency if provided, otherwise use existing frequency
  const effectiveFrequency = validation.data.frequency ?? existingSource.frequency ?? "monthly";
  const effectiveDayOfMonth = validation.data.dayOfMonth !== undefined
    ? validation.data.dayOfMonth
    : existingSource.dayOfMonth;

  const frequencyValidation = validateIncomeFrequencyFields(effectiveFrequency, effectiveDayOfMonth);
  if (!frequencyValidation.valid) {
    return errorResponse(frequencyValidation.error!, 400);
  }

  // Validate contribution <= amount
  const effectiveAmount = validation.data.amount ?? existingSource.amount ?? 0;
  const effectiveContribution = validation.data.contributionAmount !== undefined
    ? validation.data.contributionAmount
    : existingSource.contributionAmount;
  if (effectiveContribution != null && effectiveContribution > effectiveAmount) {
    return errorResponse("Contribuição não pode ser maior que o valor da renda", 400);
  }

  const updateData = {
    ...validation.data,
    ...(validation.data.name && { name: capitalizeWords(validation.data.name) }),
    updatedAt: new Date(),
  };

  const [updatedSource] = await db
    .update(incomeSources)
    .set(updateData)
    .where(eq(incomeSources.id, sourceId))
    .returning();

  // If amount changed, update income transactions for this source
  if (validation.data.amount != null && validation.data.amount !== existingSource.amount) {
    const oldAmount = existingSource.amount ?? 0;
    const newAmount = validation.data.amount;
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    // Update all pending transactions (any month)
    await db
      .update(transactions)
      .set({ amount: newAmount, updatedAt: new Date() })
      .where(
        and(
          eq(transactions.incomeSourceId, sourceId),
          eq(transactions.status, "pending"),
          eq(transactions.type, "income")
        )
      );

    // Also update confirmed transactions in the CURRENT month that still have the
    // old amount (auto-confirmed before user changed the value). Also reverse the
    // balance difference on the account.
    const staleConfirmed = await db
      .select({ id: transactions.id, accountId: transactions.accountId })
      .from(transactions)
      .where(
        and(
          eq(transactions.incomeSourceId, sourceId),
          inArray(transactions.status, ["cleared", "reconciled"]),
          eq(transactions.type, "income"),
          eq(transactions.amount, oldAmount),
          gte(transactions.date, monthStart),
          lte(transactions.date, monthEnd)
        )
      );

    if (staleConfirmed.length > 0) {
      const diff = newAmount - oldAmount;

      // Update transaction amounts
      await db
        .update(transactions)
        .set({ amount: newAmount, updatedAt: new Date() })
        .where(inArray(transactions.id, staleConfirmed.map((t) => t.id)));

      // Adjust account balances for the difference
      const accountIds = [...new Set(staleConfirmed.map((t) => t.accountId))];
      for (const accId of accountIds) {
        const countForAccount = staleConfirmed.filter((t) => t.accountId === accId).length;
        await db
          .update(financialAccounts)
          .set({
            balance: sql`${financialAccounts.balance} + ${diff * countForAccount}`,
            updatedAt: new Date(),
          })
          .where(eq(financialAccounts.id, accId));
      }
    }
  }

  return successResponse({ incomeSource: updatedSource });
});

// DELETE - Delete an income source (soft delete by deactivating)
export const DELETE = withAuthRequired(async (req, context) => {
  const { session } = context;
  const params = await context.params;
  const sourceId = params.id as string;

  const budgetIds = await getUserBudgetIds(session.user.id);
  if (budgetIds.length === 0) {
    return notFoundError("Income source");
  }

  const [existingSource] = await db
    .select()
    .from(incomeSources)
    .where(
      and(
        eq(incomeSources.id, sourceId),
        inArray(incomeSources.budgetId, budgetIds)
      )
    );

  if (!existingSource) {
    return notFoundError("Income source");
  }

  // Soft delete by deactivating
  await db
    .update(incomeSources)
    .set({
      isActive: false,
      updatedAt: new Date(),
    })
    .where(eq(incomeSources.id, sourceId));

  return successResponse({ success: true });
});
