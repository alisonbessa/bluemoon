import withAuthRequired from "@/lib/auth/withAuthRequired";
import { db } from "@/db";
import { transactions, budgetMembers, financialAccounts } from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { financialTransactionStatusEnum } from "@/db/schema/transactions";

const updateTransactionSchema = z.object({
  categoryId: z.string().uuid().optional().nullable(),
  memberId: z.string().uuid().optional().nullable(),
  amount: z.number().int().optional(),
  description: z.string().optional(),
  notes: z.string().optional(),
  date: z.string().datetime().or(z.date()).optional(),
  status: financialTransactionStatusEnum.optional(),
});

// Helper to get user's budget IDs
async function getUserBudgetIds(userId: string) {
  const memberships = await db
    .select({ budgetId: budgetMembers.budgetId })
    .from(budgetMembers)
    .where(eq(budgetMembers.userId, userId));
  return memberships.map((m) => m.budgetId);
}

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

  // If amount changed, update account balance
  if (validation.data.amount !== undefined && validation.data.amount !== existingTransaction.amount) {
    const amountDiff = validation.data.amount - existingTransaction.amount;

    const [account] = await db
      .select()
      .from(financialAccounts)
      .where(eq(financialAccounts.id, existingTransaction.accountId));

    if (account) {
      const balanceChange =
        existingTransaction.type === "income" ? amountDiff : -amountDiff;

      await db
        .update(financialAccounts)
        .set({
          balance: account.balance + balanceChange,
          updatedAt: new Date(),
        })
        .where(eq(financialAccounts.id, existingTransaction.accountId));
    }
  }

  const [updatedTransaction] = await db
    .update(transactions)
    .set(updateData)
    .where(eq(transactions.id, transactionId))
    .returning();

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

  // Reverse the balance change
  const [account] = await db
    .select()
    .from(financialAccounts)
    .where(eq(financialAccounts.id, existingTransaction.accountId));

  if (account) {
    const balanceChange =
      existingTransaction.type === "income"
        ? -existingTransaction.amount
        : Math.abs(existingTransaction.amount);

    await db
      .update(financialAccounts)
      .set({
        balance: account.balance + balanceChange,
        updatedAt: new Date(),
      })
      .where(eq(financialAccounts.id, existingTransaction.accountId));
  }

  // Delete the transaction
  await db.delete(transactions).where(eq(transactions.id, transactionId));

  // If this is a parent installment, delete child installments too
  if (existingTransaction.isInstallment && !existingTransaction.parentTransactionId) {
    await db
      .delete(transactions)
      .where(eq(transactions.parentTransactionId, transactionId));
  }

  return NextResponse.json({ success: true });
});
