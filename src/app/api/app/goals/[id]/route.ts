import withAuthRequired from "@/shared/lib/auth/withAuthRequired";
import { db } from "@/db";
import { goals } from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { capitalizeWords } from "@/shared/lib/utils";
import { getUserBudgetIds } from "@/shared/lib/api/permissions";
import {
  validationError,
  notFoundError,
  successResponse,
} from "@/shared/lib/api/responses";
import { updateGoalSchema } from "@/shared/lib/validations";

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
    return notFoundError("Goal");
  }

  const [goal] = await db
    .select()
    .from(goals)
    .where(and(eq(goals.id, id), inArray(goals.budgetId, budgetIds)));

  if (!goal) {
    return notFoundError("Goal");
  }

  return successResponse({
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
    return validationError(validation.error);
  }

  const budgetIds = await getUserBudgetIds(session.user.id);
  if (budgetIds.length === 0) {
    return notFoundError("Goal");
  }

  // Check goal exists and user has access
  const [existingGoal] = await db
    .select()
    .from(goals)
    .where(and(eq(goals.id, id), inArray(goals.budgetId, budgetIds)));

  if (!existingGoal) {
    return notFoundError("Goal");
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

  return successResponse({
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
    return notFoundError("Goal");
  }

  // Check goal exists and user has access
  const [existingGoal] = await db
    .select()
    .from(goals)
    .where(and(eq(goals.id, id), inArray(goals.budgetId, budgetIds)));

  if (!existingGoal) {
    return notFoundError("Goal");
  }

  // Soft delete - mark as archived
  await db
    .update(goals)
    .set({ isArchived: true, updatedAt: new Date() })
    .where(eq(goals.id, id));

  return successResponse({ success: true });
});
