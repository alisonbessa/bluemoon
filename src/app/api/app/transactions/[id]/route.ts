import withAuthRequired from "@/shared/lib/auth/withAuthRequired";
import { db } from "@/db";
import { transactions, financialAccounts } from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { financialTransactionStatusEnum } from "@/db/schema/transactions";
import { getUserBudgetIds } from "@/shared/lib/api/permissions";

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
    return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
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
    return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
  }

  return NextResponse.json({ transaction });
});

// PATCH - Update a transaction
export const PATCH = withAuthRequired(async (req, context) => {
  const { session } = context;
  const params = await context.params;
  const transactionId = params.id as string;
  const body = await req.json();

  const budgetIds = await getUserBudgetIds(session.user.id);
  if (budgetIds.length === 0) {
    return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
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
    return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
  }

  const validation = updateTransactionSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(
      { error: "Validation failed", details: validation.error.errors },
      { status: 400 }
    );
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

      // Update source account
      const [account] = await tx
        .select()
        .from(financialAccounts)
        .where(eq(financialAccounts.id, existingTransaction.accountId));

      if (account) {
        const balanceChange =
          existingTransaction.type === "income" ? amountDiff : -amountDiff;

        await tx
          .update(financialAccounts)
          .set({
            balance: account.balance + balanceChange,
            updatedAt: new Date(),
          })
          .where(eq(financialAccounts.id, existingTransaction.accountId));
      }

      // For transfers, also update destination account
      if (existingTransaction.type === "transfer" && existingTransaction.toAccountId) {
        const [toAccount] = await tx
          .select()
          .from(financialAccounts)
          .where(eq(financialAccounts.id, existingTransaction.toAccountId));

        if (toAccount) {
          // Destination gets positive difference (receives more/less money)
          await tx
            .update(financialAccounts)
            .set({
              balance: toAccount.balance + amountDiff,
              updatedAt: new Date(),
            })
            .where(eq(financialAccounts.id, existingTransaction.toAccountId));
        }
      }
    }

    const [updated] = await tx
      .update(transactions)
      .set(updateData)
      .where(eq(transactions.id, transactionId))
      .returning();

    return updated;
  });

  return NextResponse.json({ transaction: updatedTransaction });
});

// DELETE - Delete a transaction
export const DELETE = withAuthRequired(async (req, context) => {
  const { session } = context;
  const params = await context.params;
  const transactionId = params.id as string;

  const budgetIds = await getUserBudgetIds(session.user.id);
  if (budgetIds.length === 0) {
    return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
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
    return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
  }

  // Use transaction for atomic delete and balance update
  await db.transaction(async (tx) => {
    // Reverse the balance change for source account
    const [account] = await tx
      .select()
      .from(financialAccounts)
      .where(eq(financialAccounts.id, existingTransaction.accountId));

    if (account) {
      const balanceChange =
        existingTransaction.type === "income"
          ? -existingTransaction.amount
          : Math.abs(existingTransaction.amount);

      await tx
        .update(financialAccounts)
        .set({
          balance: account.balance + balanceChange,
          updatedAt: new Date(),
        })
        .where(eq(financialAccounts.id, existingTransaction.accountId));
    }

    // For transfers, also reverse the destination account balance
    if (existingTransaction.type === "transfer" && existingTransaction.toAccountId) {
      const [toAccount] = await tx
        .select()
        .from(financialAccounts)
        .where(eq(financialAccounts.id, existingTransaction.toAccountId));

      if (toAccount) {
        // Reverse the transfer: destination loses the amount it received
        await tx
          .update(financialAccounts)
          .set({
            balance: toAccount.balance - Math.abs(existingTransaction.amount),
            updatedAt: new Date(),
          })
          .where(eq(financialAccounts.id, existingTransaction.toAccountId));
      }
    }

    // If this is a parent installment, delete child installments first
    if (existingTransaction.isInstallment && !existingTransaction.parentTransactionId) {
      await tx
        .delete(transactions)
        .where(eq(transactions.parentTransactionId, transactionId));
    }

    // Delete the transaction
    await tx.delete(transactions).where(eq(transactions.id, transactionId));
  });

  return NextResponse.json({ success: true });
});
