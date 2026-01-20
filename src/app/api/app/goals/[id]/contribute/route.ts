import withAuthRequired from "@/shared/lib/auth/withAuthRequired";
import { db } from "@/db";
import { goals, goalContributions, budgetMembers, transactions, financialAccounts } from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

const contributeSchema = z.object({
  amount: z.number().int().min(1),
  year: z.number().int().min(2020).max(2100),
  month: z.number().int().min(1).max(12),
  fromAccountId: z.string().uuid(), // Conta de origem (obrigatória)
});

// Helper to get user's budget IDs
async function getUserBudgetIds(userId: string) {
  const memberships = await db
    .select({ budgetId: budgetMembers.budgetId })
    .from(budgetMembers)
    .where(eq(budgetMembers.userId, userId));
  return memberships.map((m) => m.budgetId);
}

// Helper to calculate goal metrics
function calculateGoalMetrics(goal: typeof goals.$inferSelect) {
  const now = new Date();
  const targetDate = new Date(goal.targetDate);
  const currentAmount = goal.currentAmount ?? 0;
  const targetAmount = goal.targetAmount;

  const progress = Math.min(
    Math.round((currentAmount / targetAmount) * 100),
    100
  );

  const monthsRemaining = Math.max(
    0,
    (targetDate.getFullYear() - now.getFullYear()) * 12 +
      (targetDate.getMonth() - now.getMonth())
  );

  const remaining = targetAmount - currentAmount;
  const monthlyTarget =
    monthsRemaining > 0 ? Math.ceil(remaining / monthsRemaining) : remaining;

  return {
    progress,
    monthsRemaining,
    monthlyTarget,
    remaining,
  };
}

// POST - Add a contribution to a goal
export const POST = withAuthRequired(async (req, context) => {
  const { session } = context;
  const params = await context.params;
  const goalId = params.id as string;
  const body = await req.json();

  const validation = contributeSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(
      { error: "Validation failed", details: validation.error.errors },
      { status: 400 }
    );
  }

  const { amount, year, month, fromAccountId } = validation.data;

  const budgetIds = await getUserBudgetIds(session.user.id);
  if (budgetIds.length === 0) {
    return NextResponse.json({ error: "Goal not found" }, { status: 404 });
  }

  // Check goal exists and user has access
  const [existingGoal] = await db
    .select()
    .from(goals)
    .where(and(eq(goals.id, goalId), inArray(goals.budgetId, budgetIds)));

  if (!existingGoal) {
    return NextResponse.json({ error: "Goal not found" }, { status: 404 });
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
    return NextResponse.json(
      { error: "Conta de origem não encontrada" },
      { status: 404 }
    );
  }

  // Create the transfer transaction
  const transactionDate = new Date(year, month - 1, new Date().getDate());

  const [newTransaction] = await db
    .insert(transactions)
    .values({
      budgetId: existingGoal.budgetId,
      accountId: fromAccountId,
      toAccountId: existingGoal.accountId, // Conta destino da meta (pode ser null)
      type: "transfer",
      status: "cleared",
      amount: amount,
      description: `Contribuição para meta: ${existingGoal.name}`,
      date: transactionDate,
      source: "web",
    })
    .returning();

  // Update account balances
  // Subtract from source account
  await db
    .update(financialAccounts)
    .set({
      balance: (fromAccount.balance ?? 0) - amount,
      updatedAt: new Date(),
    })
    .where(eq(financialAccounts.id, fromAccountId));

  // Add to goal's account if it has one
  if (existingGoal.accountId) {
    const [toAccount] = await db
      .select()
      .from(financialAccounts)
      .where(eq(financialAccounts.id, existingGoal.accountId));

    if (toAccount) {
      await db
        .update(financialAccounts)
        .set({
          balance: (toAccount.balance ?? 0) + amount,
          updatedAt: new Date(),
        })
        .where(eq(financialAccounts.id, existingGoal.accountId));
    }
  }

  // Create the contribution record
  const [contribution] = await db
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

  // Update goal's current amount
  const newCurrentAmount = (existingGoal.currentAmount ?? 0) + amount;
  const isNowCompleted = newCurrentAmount >= existingGoal.targetAmount;

  const updateData: Partial<typeof goals.$inferInsert> = {
    currentAmount: newCurrentAmount,
    updatedAt: new Date(),
  };

  // Mark as completed if reached target
  if (isNowCompleted && !existingGoal.isCompleted) {
    updateData.isCompleted = true;
    updateData.completedAt = new Date();
  }

  const [updatedGoal] = await db
    .update(goals)
    .set(updateData)
    .where(eq(goals.id, goalId))
    .returning();

  return NextResponse.json({
    contribution,
    transaction: newTransaction,
    goal: {
      ...updatedGoal,
      ...calculateGoalMetrics(updatedGoal),
    },
    justCompleted: isNowCompleted && !existingGoal.isCompleted,
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
    return NextResponse.json({ error: "Goal not found" }, { status: 404 });
  }

  // Check goal exists and user has access
  const [existingGoal] = await db
    .select()
    .from(goals)
    .where(and(eq(goals.id, goalId), inArray(goals.budgetId, budgetIds)));

  if (!existingGoal) {
    return NextResponse.json({ error: "Goal not found" }, { status: 404 });
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

  return NextResponse.json({ contributions });
});
