import withAuthRequired from "@/lib/auth/withAuthRequired";
import { db } from "@/db";
import { goals, goalContributions, budgetMembers } from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

const contributeSchema = z.object({
  amount: z.number().int().min(1),
  year: z.number().int().min(2020).max(2100),
  month: z.number().int().min(1).max(12),
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

  const { amount, year, month } = validation.data;

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

  // Check if contribution for this month already exists
  const [existingContribution] = await db
    .select()
    .from(goalContributions)
    .where(
      and(
        eq(goalContributions.goalId, goalId),
        eq(goalContributions.year, year),
        eq(goalContributions.month, month)
      )
    );

  let contribution;
  let amountDifference: number;

  if (existingContribution) {
    // Update existing contribution
    amountDifference = amount - existingContribution.amount;
    [contribution] = await db
      .update(goalContributions)
      .set({ amount })
      .where(eq(goalContributions.id, existingContribution.id))
      .returning();
  } else {
    // Create new contribution
    amountDifference = amount;
    [contribution] = await db
      .insert(goalContributions)
      .values({
        goalId,
        year,
        month,
        amount,
      })
      .returning();
  }

  // Update goal's current amount
  const newCurrentAmount = (existingGoal.currentAmount ?? 0) + amountDifference;
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
