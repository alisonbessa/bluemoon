import withAuthRequired from "@/shared/lib/auth/withAuthRequired";
import { db } from "@/db";
import { transactions, financialAccounts } from "@/db/schema";
import { eq, and, inArray, or, sql } from "drizzle-orm";
import { z } from "zod";
import { financialTransactionStatusEnum } from "@/db/schema/transactions";
import { getUserBudgetIds } from "@/shared/lib/api/permissions";
import {
  validationError,
  notFoundError,
  successResponse,
} from "@/shared/lib/api/responses";

const updateTransactionSchema = z.object({
  categoryId: z.string().uuid().optional().nullable(),
  memberId: z.string().uuid().optional().nullable(),
  amount: z.number().int().optional(),
  description: z.string().optional(),
  notes: z.string().optional(),
  date: z.string().datetime().or(z.date()).optional(),
  status: financialTransactionStatusEnum.optional(),
});

// GET - Get a specific transaction
export const GET = withAuthRequired(async (req, context) => {
  const { session } = context;
  const params = await context.params;
  const transactionId = params.id as string;

  const budgetIds = await getUserBudgetIds(session.user.id);
  if (budgetIds.length === 0) {
    return notFoundError("Transaction");
  }

  const [transaction] = await db
    .select()
    .from(transactions)
    .where(
      and(
        eq(transactions.id, transactionId),
        inArray(transactions.budgetId, budgetIds)
      )
    );

  if (!transaction) {
    return notFoundError("Transaction");
  }

  return successResponse({ transaction });
});

// PATCH - Update a transaction
export const PATCH = withAuthRequired(async (req, context) => {
  const { session } = context;
  const params = await context.params;
  const transactionId = params.id as string;
  const { searchParams } = new URL(req.url);
  const applyToSeries = searchParams.get("applyToSeries") === "true";
  const body = await req.json();

  const budgetIds = await getUserBudgetIds(session.user.id);
  if (budgetIds.length === 0) {
    return notFoundError("Transaction");
  }

  const [existingTransaction] = await db
    .select()
    .from(transactions)
    .where(
      and(
        eq(transactions.id, transactionId),
        inArray(transactions.budgetId, budgetIds)
      )
    );

  if (!existingTransaction) {
    return notFoundError("Transaction");
  }

  const validation = updateTransactionSchema.safeParse(body);
  if (!validation.success) {
    return validationError(validation.error);
  }

  // Series update: apply changes to all installments in the series
  if (applyToSeries && existingTransaction.isInstallment) {
    const parentId = existingTransaction.parentTransactionId || existingTransaction.id;

    // Build cascade update data (only fields that make sense for series)
    const seriesUpdateData: Record<string, unknown> = { updatedAt: new Date() };
    if (validation.data.categoryId !== undefined) seriesUpdateData.categoryId = validation.data.categoryId;
    if (validation.data.description !== undefined) seriesUpdateData.description = validation.data.description;
    if (validation.data.notes !== undefined) seriesUpdateData.notes = validation.data.notes;

    const updatedTransaction = await db.transaction(async (tx) => {
      const seriesTransactions = await tx
        .select()
        .from(transactions)
        .where(
          or(
            eq(transactions.id, parentId),
            eq(transactions.parentTransactionId, parentId)
          )
        );

      // Handle amount change across all installments
      if (validation.data.amount !== undefined && validation.data.amount !== existingTransaction.amount) {
        const newAmount = validation.data.amount;
        const oldAmount = existingTransaction.amount;

        // Check account type to determine balance impact
        const [account] = await tx
          .select()
          .from(financialAccounts)
          .where(eq(financialAccounts.id, existingTransaction.accountId));

        if (account) {
          const isCreditCard = account.type === "credit_card";
          const multiplier = isCreditCard ? seriesTransactions.length : 1;
          const totalDiff = (newAmount - oldAmount) * multiplier;
          const balanceChange = existingTransaction.type === "income" ? totalDiff : -totalDiff;

          // Atomic balance update (fix 1.1)
          await tx
            .update(financialAccounts)
            .set({
              balance: sql`${financialAccounts.balance} + ${balanceChange}`,
              updatedAt: new Date(),
            })
            .where(eq(financialAccounts.id, existingTransaction.accountId));
        }

        seriesUpdateData.amount = newAmount;
      }

      // Apply updates to all transactions in the series
      const allIds = seriesTransactions.map(t => t.id);
      await tx
        .update(transactions)
        .set(seriesUpdateData)
        .where(inArray(transactions.id, allIds));

      const [updated] = await tx
        .select()
        .from(transactions)
        .where(eq(transactions.id, transactionId));

      return updated;
    });

    return successResponse({ transaction: updatedTransaction });
  }

  const updateData: Record<string, unknown> = {
    ...validation.data,
    updatedAt: new Date(),
  };

  // Handle date conversion
  if (validation.data.date) {
    updateData.date =
      typeof validation.data.date === "string"
        ? new Date(validation.data.date)
        : validation.data.date;
  }

  // Use transaction for atomic update of transaction and balance
  const updatedTransaction = await db.transaction(async (tx) => {
    // If amount changed, update account balance(s)
    if (validation.data.amount !== undefined && validation.data.amount !== existingTransaction.amount) {
      const amountDiff = validation.data.amount - existingTransaction.amount;
      const balanceChange =
        existingTransaction.type === "income" ? amountDiff : -amountDiff;

      // Atomic balance update (fix 1.1)
      await tx
        .update(financialAccounts)
        .set({
          balance: sql`${financialAccounts.balance} + ${balanceChange}`,
          updatedAt: new Date(),
        })
        .where(eq(financialAccounts.id, existingTransaction.accountId));

      // For transfers, also update destination account
      if (existingTransaction.type === "transfer" && existingTransaction.toAccountId) {
        await tx
          .update(financialAccounts)
          .set({
            balance: sql`${financialAccounts.balance} + ${amountDiff}`,
            updatedAt: new Date(),
          })
          .where(eq(financialAccounts.id, existingTransaction.toAccountId));
      }
    }

    // Update clearedBalance when status changes to/from cleared/reconciled (fix 2.3)
    if (validation.data.status && validation.data.status !== existingTransaction.status) {
      const oldIsConfirmed = existingTransaction.status === "cleared" || existingTransaction.status === "reconciled";
      const newIsConfirmed = validation.data.status === "cleared" || validation.data.status === "reconciled";

      if (!oldIsConfirmed && newIsConfirmed) {
        // Becoming confirmed: add to clearedBalance
        const clearedChange = existingTransaction.type === "income"
          ? existingTransaction.amount
          : -Math.abs(existingTransaction.amount);
        await tx
          .update(financialAccounts)
          .set({
            clearedBalance: sql`${financialAccounts.clearedBalance} + ${clearedChange}`,
            updatedAt: new Date(),
          })
          .where(eq(financialAccounts.id, existingTransaction.accountId));
      } else if (oldIsConfirmed && !newIsConfirmed) {
        // Becoming unconfirmed: subtract from clearedBalance
        const clearedChange = existingTransaction.type === "income"
          ? -existingTransaction.amount
          : Math.abs(existingTransaction.amount);
        await tx
          .update(financialAccounts)
          .set({
            clearedBalance: sql`${financialAccounts.clearedBalance} + ${clearedChange}`,
            updatedAt: new Date(),
          })
          .where(eq(financialAccounts.id, existingTransaction.accountId));
      }
    }

    const [updated] = await tx
      .update(transactions)
      .set(updateData)
      .where(eq(transactions.id, transactionId))
      .returning();

    return updated;
  });

  return successResponse({ transaction: updatedTransaction });
});

// DELETE - Delete a transaction
export const DELETE = withAuthRequired(async (req, context) => {
  const { session } = context;
  const params = await context.params;
  const transactionId = params.id as string;

  const budgetIds = await getUserBudgetIds(session.user.id);
  if (budgetIds.length === 0) {
    return notFoundError("Transaction");
  }

  const [existingTransaction] = await db
    .select()
    .from(transactions)
    .where(
      and(
        eq(transactions.id, transactionId),
        inArray(transactions.budgetId, budgetIds)
      )
    );

  if (!existingTransaction) {
    return notFoundError("Transaction");
  }

  await db.transaction(async (tx) => {
    const [account] = await tx
      .select()
      .from(financialAccounts)
      .where(eq(financialAccounts.id, existingTransaction.accountId));

    const isCreditCard = account?.type === "credit_card";
    const isParentInstallment = existingTransaction.isInstallment && !existingTransaction.parentTransactionId;
    const isChildInstallment = existingTransaction.isInstallment && !!existingTransaction.parentTransactionId;

    // Calculate total amount to reverse (fix 2.4)
    let totalAmountToReverse: number;

    if (isCreditCard && isParentInstallment) {
      // Credit card parent: all installments were debited at creation → reverse all
      const childTransactions = await tx
        .select({ amount: transactions.amount })
        .from(transactions)
        .where(eq(transactions.parentTransactionId, transactionId));

      totalAmountToReverse = existingTransaction.amount;
      for (const child of childTransactions) {
        totalAmountToReverse += child.amount;
      }
    } else if (isCreditCard && isChildInstallment) {
      // Credit card child installment: reverse only this installment's amount (fix 2.4)
      totalAmountToReverse = existingTransaction.amount;
    } else if (!isCreditCard && isParentInstallment) {
      // Non-CC parent: only first installment was debited
      totalAmountToReverse = existingTransaction.amount;
    } else {
      // Regular transaction or non-CC child (child didn't affect balance)
      totalAmountToReverse = isChildInstallment ? 0 : existingTransaction.amount;
    }

    // Reverse the balance change for source account using atomic update (fix 1.1)
    if (totalAmountToReverse !== 0) {
      const balanceChange =
        existingTransaction.type === "income"
          ? -totalAmountToReverse
          : Math.abs(totalAmountToReverse);

      await tx
        .update(financialAccounts)
        .set({
          balance: sql`${financialAccounts.balance} + ${balanceChange}`,
          updatedAt: new Date(),
        })
        .where(eq(financialAccounts.id, existingTransaction.accountId));

      // Also update clearedBalance if the transaction was confirmed (fix 2.3)
      const isConfirmed = existingTransaction.status === "cleared" || existingTransaction.status === "reconciled";
      if (isConfirmed) {
        await tx
          .update(financialAccounts)
          .set({
            clearedBalance: sql`${financialAccounts.clearedBalance} + ${balanceChange}`,
          })
          .where(eq(financialAccounts.id, existingTransaction.accountId));
      }
    }

    // For transfers, also reverse the destination account balance (fix 1.1)
    if (existingTransaction.type === "transfer" && existingTransaction.toAccountId) {
      await tx
        .update(financialAccounts)
        .set({
          balance: sql`${financialAccounts.balance} - ${Math.abs(existingTransaction.amount)}`,
          updatedAt: new Date(),
        })
        .where(eq(financialAccounts.id, existingTransaction.toAccountId));
    }

    // If this is a parent installment, delete child installments first
    if (isParentInstallment) {
      await tx
        .delete(transactions)
        .where(eq(transactions.parentTransactionId, transactionId));
    }

    // Delete the transaction
    await tx.delete(transactions).where(eq(transactions.id, transactionId));
  });

  return successResponse({ success: true });
});
