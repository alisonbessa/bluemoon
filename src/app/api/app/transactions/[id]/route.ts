import withAuthRequired from "@/shared/lib/auth/withAuthRequired";
import { requireActiveSubscription } from "@/shared/lib/auth/withSubscriptionRequired";
import { db } from "@/db";
import { transactions, financialAccounts, categories, budgetMembers, incomeSources, recurringBills } from "@/db/schema";
import { eq, and, inArray, or, sql, gte, lte } from "drizzle-orm";
import { getUserBudgetIds } from "@/shared/lib/api/permissions";
import { updateTransactionSchema } from "@/shared/lib/validations/transaction.schema";
import {
  validationError,
  notFoundError,
  successResponse,
  errorResponse,
} from "@/shared/lib/api/responses";

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

  // Require active subscription for modifying transactions
  const subscriptionError = await requireActiveSubscription(session.user.id);
  if (subscriptionError) return subscriptionError;

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

  // When categoryId changes, derive the new scope (memberId) from the category
  let derivedScopeMemberId: string | null | undefined;
  if (validation.data.categoryId !== undefined) {
    if (validation.data.categoryId === null) {
      // Category removed: scope falls back to paidByMemberId (personal to whoever paid)
      derivedScopeMemberId = existingTransaction.paidByMemberId;
    } else {
      // Category changed: inherit scope from new category
      const [cat] = await db
        .select({ id: categories.id, memberId: categories.memberId })
        .from(categories)
        .where(eq(categories.id, validation.data.categoryId));
      if (!cat) {
        return errorResponse("Category not found", 400);
      }
      derivedScopeMemberId = cat.memberId;
    }
  }

  // Validate paidByMemberId if provided
  if (validation.data.paidByMemberId) {
    const [member] = await db
      .select({ id: budgetMembers.id })
      .from(budgetMembers)
      .where(
        and(
          eq(budgetMembers.id, validation.data.paidByMemberId),
          eq(budgetMembers.budgetId, existingTransaction.budgetId)
        )
      );
    if (!member) {
      return errorResponse("Paid-by member does not belong to this budget", 400);
    }
  }

  // Series update: apply changes to all installments in the series
  if (applyToSeries && existingTransaction.isInstallment) {
    const parentId = existingTransaction.parentTransactionId || existingTransaction.id;

    // Build cascade update data (only fields that make sense for series)
    const seriesUpdateData: Record<string, unknown> = { updatedAt: new Date() };
    if (validation.data.categoryId !== undefined) seriesUpdateData.categoryId = validation.data.categoryId;
    if (derivedScopeMemberId !== undefined) seriesUpdateData.memberId = derivedScopeMemberId;
    if (validation.data.paidByMemberId !== undefined) seriesUpdateData.paidByMemberId = validation.data.paidByMemberId;
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

  const { paidByMemberId: _paidBy, ...validatedFields } = validation.data;
  const updateData: Record<string, unknown> = {
    ...validatedFields,
    updatedAt: new Date(),
  };

  // Apply derived scope when categoryId changes
  if (derivedScopeMemberId !== undefined) {
    updateData.memberId = derivedScopeMemberId;
  }

  // Apply paidByMemberId if provided
  if (validation.data.paidByMemberId) {
    updateData.paidByMemberId = validation.data.paidByMemberId;
  }

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

// Parse virtual/scheduled IDs like "income-{uuid}-{year}-{month}" or "bill-{uuid}-{year}-{month}"
function parseVirtualId(id: string) {
  const match = id.match(/^(income|bill|goal)-([0-9a-f-]{36})-(\d{4})-(\d{1,2})(?:-(\d{1,2}))?$/);
  if (!match) return null;
  return {
    type: match[1] as "income" | "bill" | "goal",
    sourceId: match[2],
    year: parseInt(match[3]),
    month: parseInt(match[4]),
    day: match[5] ? parseInt(match[5]) : undefined,
  };
}

// DELETE - Delete a transaction
export const DELETE = withAuthRequired(async (req, context) => {
  const { session } = context;

  // Require active subscription for deleting transactions
  const subscriptionError = await requireActiveSubscription(session.user.id);
  if (subscriptionError) return subscriptionError;

  const params = await context.params;
  const transactionId = params.id as string;

  const budgetIds = await getUserBudgetIds(session.user.id);
  if (budgetIds.length === 0) {
    return notFoundError("Transaction");
  }

  // Handle virtual/scheduled IDs (from the scheduled transactions endpoint)
  const virtualId = parseVirtualId(transactionId);
  if (virtualId) {
    const startDate = new Date(virtualId.year, virtualId.month - 1, 1);
    const endDate = new Date(virtualId.year, virtualId.month, 0, 23, 59, 59);

    const sourceCondition =
      virtualId.type === "income"
        ? eq(transactions.incomeSourceId, virtualId.sourceId)
        : eq(transactions.recurringBillId, virtualId.sourceId);

    // Find real transaction(s) matching this scheduled item
    const matchingTransactions = await db
      .select()
      .from(transactions)
      .where(
        and(
          sourceCondition,
          inArray(transactions.budgetId, budgetIds),
          gte(transactions.date, startDate),
          lte(transactions.date, endDate)
        )
      );

    if (matchingTransactions.length > 0) {
      // Delete all matching transactions (handles duplicates)
      for (const tx of matchingTransactions) {
        await db.transaction(async (dbTx) => {
          const [account] = await dbTx
            .select()
            .from(financialAccounts)
            .where(eq(financialAccounts.id, tx.accountId));

          const balanceChange =
            tx.type === "income" ? -tx.amount : Math.abs(tx.amount);

          if (account) {
            await dbTx
              .update(financialAccounts)
              .set({
                balance: sql`${financialAccounts.balance} + ${balanceChange}`,
                updatedAt: new Date(),
              })
              .where(eq(financialAccounts.id, tx.accountId));

            const isConfirmed = tx.status === "cleared" || tx.status === "reconciled";
            if (isConfirmed) {
              await dbTx
                .update(financialAccounts)
                .set({
                  clearedBalance: sql`${financialAccounts.clearedBalance} + ${balanceChange}`,
                })
                .where(eq(financialAccounts.id, tx.accountId));
            }
          }

          await dbTx.delete(transactions).where(eq(transactions.id, tx.id));
        });
      }
      return successResponse({ success: true, deletedCount: matchingTransactions.length });
    }

    // No real transaction found — delete the income source or recurring bill itself
    if (virtualId.type === "income") {
      const [source] = await db
        .select()
        .from(incomeSources)
        .where(
          and(
            eq(incomeSources.id, virtualId.sourceId),
            inArray(incomeSources.budgetId, budgetIds)
          )
        );
      if (source) {
        await db.delete(incomeSources).where(eq(incomeSources.id, virtualId.sourceId));
        return successResponse({ success: true, deletedSource: true });
      }
    } else if (virtualId.type === "bill") {
      const [bill] = await db
        .select()
        .from(recurringBills)
        .where(
          and(
            eq(recurringBills.id, virtualId.sourceId),
            inArray(recurringBills.budgetId, budgetIds)
          )
        );
      if (bill) {
        await db.delete(recurringBills).where(eq(recurringBills.id, virtualId.sourceId));
        return successResponse({ success: true, deletedSource: true });
      }
    }

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
