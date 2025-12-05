import withAuthRequired from "@/lib/auth/withAuthRequired";
import { db } from "@/db";
import { goals, budgetMembers } from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { capitalizeWords } from "@/lib/utils";

const updateGoalSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  icon: z.string().max(10).optional(),
  color: z.string().max(10).optional(),
  targetAmount: z.number().int().min(1).optional(),
  targetDate: z
    .string()
    .datetime()
    .or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/))
    .optional(),
  isCompleted: z.boolean().optional(),
  isArchived: z.boolean().optional(),
  displayOrder: z.number().int().optional(),
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

// GET - Get a single goal by ID
export const GET = withAuthRequired(async (req, context) => {
  const { session } = context;
  const params = await context.params;
  const id = params.id as string;

  const budgetIds = await getUserBudgetIds(session.user.id);
  if (budgetIds.length === 0) {
    return NextResponse.json({ error: "Goal not found" }, { status: 404 });
  }

  const [goal] = await db
    .select()
    .from(goals)
    .where(and(eq(goals.id, id), inArray(goals.budgetId, budgetIds)));

  if (!goal) {
    return NextResponse.json({ error: "Goal not found" }, { status: 404 });
  }

  return NextResponse.json({
    goal: {
      ...goal,
      ...calculateGoalMetrics(goal),
    },
  });
});

// PATCH - Update a goal
export const PATCH = withAuthRequired(async (req, context) => {
  const { session } = context;
  const params = await context.params;
  const id = params.id as string;
  const body = await req.json();

  const validation = updateGoalSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(
      { error: "Validation failed", details: validation.error.errors },
      { status: 400 }
    );
  }

  const budgetIds = await getUserBudgetIds(session.user.id);
  if (budgetIds.length === 0) {
    return NextResponse.json({ error: "Goal not found" }, { status: 404 });
  }

  // Check goal exists and user has access
  const [existingGoal] = await db
    .select()
    .from(goals)
    .where(and(eq(goals.id, id), inArray(goals.budgetId, budgetIds)));

  if (!existingGoal) {
    return NextResponse.json({ error: "Goal not found" }, { status: 404 });
  }

  const { targetDate, name, ...restData } = validation.data;

  const updateData: Partial<typeof goals.$inferInsert> = {
    ...restData,
    updatedAt: new Date(),
  };

  if (name) {
    updateData.name = capitalizeWords(name);
  }

  if (targetDate) {
    updateData.targetDate = new Date(targetDate);
  }

  // Handle completion
  if (validation.data.isCompleted === true && !existingGoal.isCompleted) {
    updateData.completedAt = new Date();
  } else if (validation.data.isCompleted === false) {
    updateData.completedAt = null;
  }

  const [updatedGoal] = await db
    .update(goals)
    .set(updateData)
    .where(eq(goals.id, id))
    .returning();

  return NextResponse.json({
    goal: {
      ...updatedGoal,
      ...calculateGoalMetrics(updatedGoal),
    },
  });
});

// DELETE - Soft delete a goal (archive it)
export const DELETE = withAuthRequired(async (req, context) => {
  const { session } = context;
  const params = await context.params;
  const id = params.id as string;

  const budgetIds = await getUserBudgetIds(session.user.id);
  if (budgetIds.length === 0) {
    return NextResponse.json({ error: "Goal not found" }, { status: 404 });
  }

  // Check goal exists and user has access
  const [existingGoal] = await db
    .select()
    .from(goals)
    .where(and(eq(goals.id, id), inArray(goals.budgetId, budgetIds)));

  if (!existingGoal) {
    return NextResponse.json({ error: "Goal not found" }, { status: 404 });
  }

  // Soft delete - mark as archived
  await db
    .update(goals)
    .set({ isArchived: true, updatedAt: new Date() })
    .where(eq(goals.id, id));

  return NextResponse.json({ success: true });
});
