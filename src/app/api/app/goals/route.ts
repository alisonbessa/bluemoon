import withAuthRequired from "@/shared/lib/auth/withAuthRequired";
import { requireActiveSubscription } from "@/shared/lib/auth/withSubscriptionRequired";
import { db } from "@/db";
import { goals, budgets } from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { capitalizeWords } from "@/shared/lib/utils";
import { getUserBudgetIds, getUserMemberIdInBudget } from "@/shared/lib/api/permissions";
import {
  validationError,
  forbiddenError,
  successResponse,
  cachedResponse,
} from "@/shared/lib/api/responses";
import { createGoalSchema } from "@/shared/lib/validations/goal.schema";
import { calculateGoalMetrics } from "@/shared/lib/goals/calculate-metrics";

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

  // Get privacy mode and user's member ID for the target budget
  const targetBudgetId = budgetId || budgetIds[0];
  let privacyMode = "visible";
  let userMemberId: string | null = null;

  if (targetBudgetId) {
    const [budget] = await db
      .select({ privacyMode: budgets.privacyMode })
      .from(budgets)
      .where(eq(budgets.id, targetBudgetId))
      .limit(1);
    privacyMode = budget?.privacyMode || "visible";
    userMemberId = await getUserMemberIdInBudget(session.user.id, targetBudgetId);
  }

  // Add calculated metrics and privacy flag to each goal
  const goalsWithMetrics = userGoals.map((goal) => {
    const isOtherMemberGoal = goal.memberId !== null && goal.memberId !== userMemberId;
    return {
      ...goal,
      ...calculateGoalMetrics(goal),
      isOtherMemberGoal,
    };
  });

  return cachedResponse({ goals: goalsWithMetrics, privacyMode }, { maxAge: 30, staleWhileRevalidate: 120 });
});

// POST - Create a new goal
export const POST = withAuthRequired(async (req, context) => {
  const { session } = context;

  // Require active subscription for creating goals
  const subscriptionError = await requireActiveSubscription(session.user.id);
  if (subscriptionError) return subscriptionError;

  const body = await req.json();

  const validation = createGoalSchema.safeParse(body);
  if (!validation.success) {
    return validationError(validation.error);
  }

  const { budgetId, targetDate, initialAmount, accountId, memberId, ...goalData } = validation.data;

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
      memberId: memberId ?? null,
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
