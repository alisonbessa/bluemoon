import withAuthRequired from "@/shared/lib/auth/withAuthRequired";
import { requireActiveSubscription } from "@/shared/lib/auth/withSubscriptionRequired";
import { db } from "@/db";
import { transactions, financialAccounts } from "@/db/schema";
import { eq, and, inArray, sql } from "drizzle-orm";
import { getUserBudgetIds } from "@/shared/lib/api/permissions";
import {
  validationError,
  forbiddenError,
  successResponse,
} from "@/shared/lib/api/responses";
import { z } from "zod";
import { recordAuditLog } from "@/shared/lib/security/audit-log";

const bulkActionSchema = z.object({
  action: z.enum(["updateStatus", "delete"]),
  transactionIds: z.array(z.string().uuid()).min(1).max(200),
  status: z.enum(["pending", "cleared", "reconciled"]).optional(),
});

/**
 * POST /api/app/transactions/bulk
 *
 * Batch actions for transactions (max 200 per request).
 *
 * Actions:
 *   - updateStatus: change status for all transactions (updates clearedBalance accordingly)
 *   - delete: delete all transactions, reverse balances and clearedBalance, cascade installments
 */
export const POST = withAuthRequired(async (req, context) => {
  const { session } = context;

  const subscriptionError = await requireActiveSubscription(session.user.id);
  if (subscriptionError) return subscriptionError;

  const body = await req.json();
  const validation = bulkActionSchema.safeParse(body);
  if (!validation.success) {
    return validationError(validation.error);
  }

  const { action, transactionIds, status } = validation.data;

  if (action === "updateStatus" && !status) {
    return validationError({
      issues: [{ message: "status is required for updateStatus action" }],
    } as z.ZodError);
  }

  const budgetIds = await getUserBudgetIds(session.user.id);
  if (budgetIds.length === 0) {
    return forbiddenError("No access to any budget");
  }

  // Fetch all target transactions and verify ownership
  const targetTransactions = await db
    .select()
    .from(transactions)
    .where(
      and(
        inArray(transactions.id, transactionIds),
        inArray(transactions.budgetId, budgetIds)
      )
    );

  if (targetTransactions.length !== transactionIds.length) {
    return forbiddenError("One or more transactions not found or access denied");
  }

  let successCount = 0;
  let failedCount = 0;
  const errors: string[] = [];

  if (action === "updateStatus") {
    // Update status for each transaction, adjusting clearedBalance per account
    await db.transaction(async (tx) => {
      for (const existing of targetTransactions) {
        if (existing.status === status) {
          successCount++;
          continue;
        }

        const oldIsConfirmed =
          existing.status === "cleared" || existing.status === "reconciled";
        const newIsConfirmed = status === "cleared" || status === "reconciled";

        try {
          // Update clearedBalance if status transitions between confirmed/unconfirmed
          if (oldIsConfirmed !== newIsConfirmed) {
            const absAmount = Math.abs(existing.amount);
            const clearedChange = newIsConfirmed
              ? existing.type === "income"
                ? existing.amount
                : -absAmount
              : existing.type === "income"
              ? -existing.amount
              : absAmount;

            await tx
              .update(financialAccounts)
              .set({
                clearedBalance: sql`${financialAccounts.clearedBalance} + ${clearedChange}`,
                updatedAt: new Date(),
              })
              .where(eq(financialAccounts.id, existing.accountId));

            // Transfer: mirror the change on the destination account so that
            // the cleared balance stays consistent on both sides.
            if (existing.type === "transfer" && existing.toAccountId) {
              const destChange = newIsConfirmed ? absAmount : -absAmount;
              await tx
                .update(financialAccounts)
                .set({
                  clearedBalance: sql`${financialAccounts.clearedBalance} + ${destChange}`,
                  updatedAt: new Date(),
                })
                .where(eq(financialAccounts.id, existing.toAccountId));
            }
          }

          await tx
            .update(transactions)
            .set({ status, updatedAt: new Date() })
            .where(eq(transactions.id, existing.id));

          successCount++;
        } catch (err) {
          failedCount++;
          errors.push(`${existing.id}: ${String(err)}`);
        }
      }
    });

    return successResponse({
      success: successCount,
      failed: failedCount,
      ...(errors.length > 0 && { errors }),
    });
  }

  // DELETE action
  // Pre-fetch all involved accounts in a single query to avoid N+1 inside the loop.
  const involvedAccountIds = Array.from(
    new Set(
      targetTransactions.flatMap((t) => [t.accountId, t.toAccountId].filter(Boolean) as string[])
    )
  );
  const accountsList = involvedAccountIds.length > 0
    ? await db
        .select()
        .from(financialAccounts)
        .where(inArray(financialAccounts.id, involvedAccountIds))
    : [];
  const accountsById = new Map(accountsList.map((a) => [a.id, a]));

  await db.transaction(async (tx) => {
    for (const existing of targetTransactions) {
      try {
        const account = accountsById.get(existing.accountId);

        const isCreditCard = account?.type === "credit_card";
        const isParentInstallment =
          existing.isInstallment && !existing.parentTransactionId;
        const isChildInstallment =
          existing.isInstallment && !!existing.parentTransactionId;

        // Calculate total amount to reverse (same logic as [id]/route.ts)
        let totalAmountToReverse: number;
        if (isCreditCard && isParentInstallment) {
          const childTransactions = await tx
            .select({ amount: transactions.amount })
            .from(transactions)
            .where(eq(transactions.parentTransactionId, existing.id));
          totalAmountToReverse = existing.amount;
          for (const child of childTransactions) {
            totalAmountToReverse += child.amount;
          }
        } else if (isCreditCard && isChildInstallment) {
          totalAmountToReverse = existing.amount;
        } else if (!isCreditCard && isParentInstallment) {
          totalAmountToReverse = existing.amount;
        } else {
          totalAmountToReverse = isChildInstallment ? 0 : existing.amount;
        }

        // Reverse balance
        if (totalAmountToReverse !== 0) {
          const balanceChange =
            existing.type === "income"
              ? -totalAmountToReverse
              : Math.abs(totalAmountToReverse);

          await tx
            .update(financialAccounts)
            .set({
              balance: sql`${financialAccounts.balance} + ${balanceChange}`,
              updatedAt: new Date(),
            })
            .where(eq(financialAccounts.id, existing.accountId));

          const isConfirmed =
            existing.status === "cleared" || existing.status === "reconciled";
          if (isConfirmed) {
            await tx
              .update(financialAccounts)
              .set({
                clearedBalance: sql`${financialAccounts.clearedBalance} + ${balanceChange}`,
              })
              .where(eq(financialAccounts.id, existing.accountId));
          }
        }

        // For transfers, reverse destination account (balance + clearedBalance if confirmed).
        if (existing.type === "transfer" && existing.toAccountId) {
          const destChange = -Math.abs(existing.amount);
          await tx
            .update(financialAccounts)
            .set({
              balance: sql`${financialAccounts.balance} + ${destChange}`,
              updatedAt: new Date(),
            })
            .where(eq(financialAccounts.id, existing.toAccountId));

          const destWasConfirmed =
            existing.status === "cleared" || existing.status === "reconciled";
          if (destWasConfirmed) {
            await tx
              .update(financialAccounts)
              .set({
                clearedBalance: sql`${financialAccounts.clearedBalance} + ${destChange}`,
              })
              .where(eq(financialAccounts.id, existing.toAccountId));
          }
        }

        // Cascade delete children for parent installments
        if (isParentInstallment) {
          await tx
            .delete(transactions)
            .where(eq(transactions.parentTransactionId, existing.id));
        }

        await tx.delete(transactions).where(eq(transactions.id, existing.id));

        successCount++;
      } catch (err) {
        failedCount++;
        errors.push(`${existing.id}: ${String(err)}`);
      }
    }
  });

  await recordAuditLog({
    userId: session.user.id,
    action:
      validation.data.action === "delete"
        ? "transaction.delete"
        : "transaction.update",
    resource: "transaction",
    details: {
      bulk: true,
      action: validation.data.action,
      status: validation.data.status,
      requestedCount: validation.data.transactionIds.length,
      successCount,
      failedCount,
    },
    req,
  });

  return successResponse({
    success: successCount,
    failed: failedCount,
    ...(errors.length > 0 && { errors }),
  });
});
