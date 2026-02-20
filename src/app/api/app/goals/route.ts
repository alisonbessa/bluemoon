import withAuthRequired from "@/shared/lib/auth/withAuthRequired";
import { db } from "@/db";
import { goals } from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { capitalizeWords } from "@/shared/lib/utils";
import { getUserBudgetIds } from "@/shared/lib/api/permissions";
import {
  validationError,
  forbiddenError,
  successResponse,
  cachedResponse,
} from "@/shared/lib/api/responses";
import { createGoalSchema } from "@/shared/lib/validations/goal.schema";

// Helper to calculate goal metrics
function calculateGoalMetrics(goal: typeof goals.$inferSelect) {
  const now = new Date();
  const targetDate = new Date(goal.targetDate);
  const currentAmount = goal.currentAmount ?? 0;
  const targetAmount = goal.targetAmount;

  // Calculate progress percentage
  const progress = Math.min(Math.round((currentAmount / targetAmount) * 100), 100);

  // Calculate months remaining
  const monthsRemaining = Math.max(
    0,
    (targetDate.getFullYear() - now.getFullYear()) * 12 +
      (targetDate.getMonth() - now.getMonth())
  );

  // Calculate monthly target
  const remaining = targetAmount - currentAmount;
  const monthlyTarget = monthsRemaining > 0 ? Math.ceil(remaining / monthsRemaining) : remaining;

  return {
    progress,
    monthsRemaining,
    monthlyTarget,
    remaining,
  };
}

// GET - Get goals for user's budgets
export const GET = withAuthRequired(async (req, context) => {
  const { session } = context;
  const { searchParams } = new URL(req.url);
  const budgetId = searchParams.get("budgetId");
  const includeArchived = searchParams.get("includeArchived") === "true";

  const budgetIds = await getUserBudgetIds(session.user.id);
  if (budgetIds.length === 0) {
    return successResponse({ goals: [] });
  }

  const conditions = [inArray(goals.budgetId, budgetIds)];

  if (budgetId) {
    conditions.push(eq(goals.budgetId, budgetId));
  }

  if (!includeArchived) {
    conditions.push(eq(goals.isArchived, false));
  }

  const userGoals = await db
    .select()
    .from(goals)
    .where(and(...conditions))
    .orderBy(goals.displayOrder);

  // Add calculated metrics to each goal
  const goalsWithMetrics = userGoals.map((goal) => ({
    ...goal,
    ...calculateGoalMetrics(goal),
  }));

  return cachedResponse({ goals: goalsWithMetrics }, { maxAge: 30, staleWhileRevalidate: 120 });
});

// POST - Create a new goal
export const POST = withAuthRequired(async (req, context) => {
  const { session } = context;
  const body = await req.json();

  const validation = createGoalSchema.safeParse(body);
  if (!validation.success) {
    return validationError(validation.error);
  }

  const { budgetId, targetDate, initialAmount, accountId, ...goalData } = validation.data;

  // Check user has access to budget
  const budgetIds = await getUserBudgetIds(session.user.id);
  if (!budgetIds.includes(budgetId)) {
    return forbiddenError("Budget not found or access denied");
  }

  // Get display order
  const existingGoals = await db
    .select()
    .from(goals)
    .where(eq(goals.budgetId, budgetId));

  const [newGoal] = await db
    .insert(goals)
    .values({
      ...goalData,
      name: capitalizeWords(goalData.name),
      budgetId,
      accountId,
      targetDate: new Date(targetDate),
      currentAmount: initialAmount || 0,
      displayOrder: existingGoals.length,
    })
    .returning();

  return successResponse(
    {
      goal: {
        ...newGoal,
        ...calculateGoalMetrics(newGoal),
      },
    },
    201
  );
});
