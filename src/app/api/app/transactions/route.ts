import withAuthRequired from "@/lib/auth/withAuthRequired";
import { db } from "@/db";
import { transactions, budgetMembers, financialAccounts, categories, incomeSources } from "@/db/schema";
import { eq, and, inArray, desc, gte, lte } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { financialTransactionTypeEnum, financialTransactionStatusEnum } from "@/db/schema/transactions";

const createTransactionSchema = z.object({
  budgetId: z.string().uuid(),
  accountId: z.string().uuid(),
  categoryId: z.string().uuid().optional(), // For expense transactions
  incomeSourceId: z.string().uuid().optional(), // For income transactions
  memberId: z.string().uuid().optional(),
  toAccountId: z.string().uuid().optional(), // For transfers
  recurringBillId: z.string().uuid().optional(), // Link to recurring bill
  type: financialTransactionTypeEnum,
  status: financialTransactionStatusEnum.optional(), // Allow setting status (default: pending)
  amount: z.number().int(), // In cents
  description: z.string().optional(),
  notes: z.string().optional(),
  date: z.string().datetime().or(z.date()),
  // Installment fields
  isInstallment: z.boolean().optional(),
  totalInstallments: z.number().int().min(2).max(72).optional(),
});

// Helper to get user's budget IDs
async function getUserBudgetIds(userId: string) {
  const memberships = await db
    .select({ budgetId: budgetMembers.budgetId })
    .from(budgetMembers)
    .where(eq(budgetMembers.userId, userId));
  return memberships.map((m) => m.budgetId);
}

// GET - Get transactions for user's budgets
export const GET = withAuthRequired(async (req, context) => {
  const { session } = context;
  const { searchParams } = new URL(req.url);

  const budgetId = searchParams.get("budgetId");
  const accountId = searchParams.get("accountId");
  const categoryId = searchParams.get("categoryId");
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");
  const limit = parseInt(searchParams.get("limit") || "50");
  const offset = parseInt(searchParams.get("offset") || "0");

  const budgetIds = await getUserBudgetIds(session.user.id);
  if (budgetIds.length === 0) {
    return NextResponse.json({ transactions: [], total: 0 });
  }

  // Build conditions
  const conditions = [
    budgetId
      ? and(eq(transactions.budgetId, budgetId), inArray(transactions.budgetId, budgetIds))
      : inArray(transactions.budgetId, budgetIds),
  ];

  if (accountId) {
    conditions.push(eq(transactions.accountId, accountId));
  }

  if (categoryId) {
    conditions.push(eq(transactions.categoryId, categoryId));
  }

  if (startDate) {
    conditions.push(gte(transactions.date, new Date(startDate)));
  }

  if (endDate) {
    conditions.push(lte(transactions.date, new Date(endDate)));
  }

  const userTransactions = await db
    .select({
      transaction: transactions,
      account: financialAccounts,
      category: categories,
      incomeSource: incomeSources,
    })
    .from(transactions)
    .leftJoin(financialAccounts, eq(transactions.accountId, financialAccounts.id))
    .leftJoin(categories, eq(transactions.categoryId, categories.id))
    .leftJoin(incomeSources, eq(transactions.incomeSourceId, incomeSources.id))
    .where(and(...conditions))
    .orderBy(desc(transactions.date))
    .limit(limit)
    .offset(offset);

  return NextResponse.json({
    transactions: userTransactions.map((t) => ({
      ...t.transaction,
      account: t.account,
      category: t.category,
      incomeSource: t.incomeSource,
    })),
  });
});

// POST - Create a new transaction (with installment support)
export const POST = withAuthRequired(async (req, context) => {
  const { session } = context;
  const body = await req.json();

  const validation = createTransactionSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(
      { error: "Validation failed", details: validation.error.errors },
      { status: 400 }
    );
  }

  const {
    budgetId,
    accountId,
    categoryId,
    incomeSourceId,
    toAccountId,
    recurringBillId,
    type,
    status,
    amount,
    description,
    notes,
    date,
    isInstallment,
    totalInstallments,
    memberId,
  } = validation.data;

  // Check user has access to budget
  const budgetIds = await getUserBudgetIds(session.user.id);
  if (!budgetIds.includes(budgetId)) {
    return NextResponse.json(
      { error: "Budget not found or access denied" },
      { status: 404 }
    );
  }

  // Validate transfer has toAccountId
  if (type === "transfer" && !toAccountId) {
    return NextResponse.json(
      { error: "Transfer requires toAccountId" },
      { status: 400 }
    );
  }

  const transactionDate = typeof date === "string" ? new Date(date) : date;

  // Handle installments with batch insert for better performance
  if (isInstallment && totalInstallments && totalInstallments > 1) {
    const installmentAmount = Math.round(amount / totalInstallments);

    // Create parent transaction (first installment)
    const [parentTransaction] = await db
      .insert(transactions)
      .values({
        budgetId,
        accountId,
        categoryId: type === "expense" ? categoryId : undefined,
        incomeSourceId: type === "income" ? incomeSourceId : undefined,
        memberId,
        type,
        amount: installmentAmount,
        description,
        notes,
        date: transactionDate,
        isInstallment: true,
        installmentNumber: 1,
        totalInstallments,
        source: "web",
      })
      .returning();

    // PERFORMANCE: Batch insert remaining installments instead of N individual inserts
    const installmentValues = Array.from({ length: totalInstallments - 1 }, (_, i) => {
      const installmentDate = new Date(transactionDate);
      installmentDate.setMonth(installmentDate.getMonth() + (i + 1));

      return {
        budgetId,
        accountId,
        categoryId: type === "expense" ? categoryId : undefined,
        incomeSourceId: type === "income" ? incomeSourceId : undefined,
        memberId,
        type,
        amount: installmentAmount,
        description,
        notes,
        date: installmentDate,
        isInstallment: true,
        installmentNumber: i + 2,
        totalInstallments,
        parentTransactionId: parentTransaction.id,
        source: "web" as const,
      };
    });

    const remainingInstallments = installmentValues.length > 0
      ? await db.insert(transactions).values(installmentValues).returning()
      : [];

    const createdTransactions = [parentTransaction, ...remainingInstallments];

    // Update account balance
    await db
      .update(financialAccounts)
      .set({
        balance: financialAccounts.balance,
        updatedAt: new Date(),
      })
      .where(eq(financialAccounts.id, accountId));

    return NextResponse.json(
      { transactions: createdTransactions },
      { status: 201 }
    );
  }

  // Create transaction and update balances atomically
  const newTransaction = await db.transaction(async (tx) => {
    // Create the transaction
    const [created] = await tx
      .insert(transactions)
      .values({
        budgetId,
        accountId,
        categoryId: type === "expense" ? categoryId : undefined,
        incomeSourceId: type === "income" ? incomeSourceId : undefined,
        recurringBillId,
        memberId,
        toAccountId,
        type,
        status: status || "pending", // Use provided status or default to pending
        amount,
        description,
        notes,
        date: transactionDate,
        source: "web",
      })
      .returning();

    // Update account balance
    const balanceChange = type === "income" ? amount : -Math.abs(amount);

    const [currentAccount] = await tx
      .select()
      .from(financialAccounts)
      .where(eq(financialAccounts.id, accountId));

    if (currentAccount) {
      await tx
        .update(financialAccounts)
        .set({
          balance: currentAccount.balance + balanceChange,
          updatedAt: new Date(),
        })
        .where(eq(financialAccounts.id, accountId));
    }

    // For transfers, update destination account
    if (type === "transfer" && toAccountId) {
      const [destAccount] = await tx
        .select()
        .from(financialAccounts)
        .where(eq(financialAccounts.id, toAccountId));

      if (destAccount) {
        await tx
          .update(financialAccounts)
          .set({
            balance: destAccount.balance + Math.abs(amount),
            updatedAt: new Date(),
          })
          .where(eq(financialAccounts.id, toAccountId));
      }
    }

    return created;
  });

  return NextResponse.json({ transaction: newTransaction }, { status: 201 });
});
