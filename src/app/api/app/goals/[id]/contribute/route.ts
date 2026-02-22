import withAuthRequired from "@/shared/lib/auth/withAuthRequired";
import { db } from "@/db";
import { goals, goalContributions, transactions, financialAccounts } from "@/db/schema";
import { eq, and, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import { getUserBudgetIds } from "@/shared/lib/api/permissions";
import {
  validationError,
  notFoundError,
  successResponse,
} from "@/shared/lib/api/responses";
import { calculateGoalMetrics } from "@/shared/lib/goals/calculate-metrics";

const contributeSchema = z.object({
  amount: z.number().int().min(1),
  year: z.number().int().min(2020).max(2100),
  month: z.number().int().min(1).max(12),
  fromAccountId: z.string().uuid(), // Conta de origem (obrigatória)
});

// POST - Add a contribution to a goal
export const POST = withAuthRequired(async (req, context) => {
  const { session } = context;
  const params = await context.params;
  const goalId = params.id as string;
  const body = await req.json();

  const validation = contributeSchema.safeParse(body);
  if (!validation.success) {
    return validationError(validation.error);
  }

  const { amount, year, month, fromAccountId } = validation.data;

  const budgetIds = await getUserBudgetIds(session.user.id);
  if (budgetIds.length === 0) {
    return notFoundError("Goal");
  }

  // Check goal exists and user has access
  const [existingGoal] = await db
    .select()
    .from(goals)
    .where(and(eq(goals.id, goalId), inArray(goals.budgetId, budgetIds)));

  if (!existingGoal) {
    return notFoundError("Goal");
  }

  // Verify the source account exists and belongs to user's budget
  const [fromAccount] = await db
    .select()
    .from(financialAccounts)
    .where(
      and(
        eq(financialAccounts.id, fromAccountId),
        inArray(financialAccounts.budgetId, budgetIds)
      )
    );

  if (!fromAccount) {
    return notFoundError("Conta de origem");
  }

  // All balance-affecting operations inside a single atomic transaction (fix 1.3)
  const result = await db.transaction(async (tx) => {
    const transactionDate = new Date(year, month - 1, new Date().getDate());

    // Create the transfer transaction
    const [newTransaction] = await tx
      .insert(transactions)
      .values({
        budgetId: existingGoal.budgetId,
        accountId: fromAccountId,
        toAccountId: existingGoal.accountId,
        type: "transfer",
        status: "cleared",
        amount: amount,
        description: `Contribuição para meta: ${existingGoal.name}`,
        date: transactionDate,
        source: "web",
      })
      .returning();

    // Atomic balance updates (fix 1.1) — no read-then-write race condition
    await tx
      .update(financialAccounts)
      .set({
        balance: sql`${financialAccounts.balance} - ${amount}`,
        clearedBalance: sql`${financialAccounts.clearedBalance} - ${amount}`,
        updatedAt: new Date(),
      })
      .where(eq(financialAccounts.id, fromAccountId));

    // Add to goal's account if it has one
    if (existingGoal.accountId) {
      await tx
        .update(financialAccounts)
        .set({
          balance: sql`${financialAccounts.balance} + ${amount}`,
          clearedBalance: sql`${financialAccounts.clearedBalance} + ${amount}`,
          updatedAt: new Date(),
        })
        .where(eq(financialAccounts.id, existingGoal.accountId));
    }

    // Create the contribution record
    const [contribution] = await tx
      .insert(goalContributions)
      .values({
        goalId,
        fromAccountId,
        transactionId: newTransaction.id,
        year,
        month,
        amount,
      })
      .returning();

    // Atomic goal amount update (fix 1.1)
    const [updatedGoal] = await tx
      .update(goals)
      .set({
        currentAmount: sql`${goals.currentAmount} + ${amount}`,
        updatedAt: new Date(),
      })
      .where(eq(goals.id, goalId))
      .returning();

    // Check completion after atomic update
    const isNowCompleted = (updatedGoal.currentAmount ?? 0) >= updatedGoal.targetAmount;
    if (isNowCompleted && !existingGoal.isCompleted) {
      await tx
        .update(goals)
        .set({ isCompleted: true, completedAt: new Date() })
        .where(eq(goals.id, goalId));
      updatedGoal.isCompleted = true;
      updatedGoal.completedAt = new Date();
    }

    return {
      contribution,
      transaction: newTransaction,
      updatedGoal,
      isNowCompleted,
    };
  });

  return successResponse({
    contribution: result.contribution,
    transaction: result.transaction,
    goal: {
      ...result.updatedGoal,
      ...calculateGoalMetrics(result.updatedGoal),
    },
    justCompleted: result.isNowCompleted && !existingGoal.isCompleted,
  });
});

// GET - Get contributions for a goal
export const GET = withAuthRequired(async (req, context) => {
  const { session } = context;
  const params = await context.params;
  const goalId = params.id as string;
  const { searchParams } = new URL(req.url);
  const year = searchParams.get("year");

  const budgetIds = await getUserBudgetIds(session.user.id);
  if (budgetIds.length === 0) {
    return notFoundError("Goal");
  }

  // Check goal exists and user has access
  const [existingGoal] = await db
    .select()
    .from(goals)
    .where(and(eq(goals.id, goalId), inArray(goals.budgetId, budgetIds)));

  if (!existingGoal) {
    return notFoundError("Goal");
  }

  const conditions = [eq(goalContributions.goalId, goalId)];
  if (year) {
    conditions.push(eq(goalContributions.year, parseInt(year)));
  }

  const contributions = await db
    .select()
    .from(goalContributions)
    .where(and(...conditions))
    .orderBy(goalContributions.year, goalContributions.month);

  return successResponse({ contributions });
});
