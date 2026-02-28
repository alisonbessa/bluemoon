import withAuthRequired from "@/shared/lib/auth/withAuthRequired";
import { requireActiveSubscription } from "@/shared/lib/auth/withSubscriptionRequired";
import { withRateLimit, rateLimits } from "@/shared/lib/security/rate-limit";
import { db } from "@/db";
import { goals, financialAccounts, budgets } from "@/db/schema";
import { eq, and, inArray, or, isNull } from "drizzle-orm";
import { capitalizeWords } from "@/shared/lib/utils";
import { getUserBudgetIds, getUserMemberIdInBudget, getPartnerPrivacyLevel } from "@/shared/lib/api/permissions";
import {
  validationError,
  forbiddenError,
  successResponse,
  cachedResponse,
} from "@/shared/lib/api/responses";
import { createGoalSchema } from "@/shared/lib/validations/goal.schema";
import { calculateGoalMetrics } from "@/shared/lib/goals/calculate-metrics";
import { parseViewMode, getViewModeCondition } from "@/shared/lib/api/view-mode-filter";

// GET - Get goals for user's budgets
// Goals are filtered by viewMode via their linked account's ownerId
export const GET = withAuthRequired(async (req, context) => {
  const { session } = context;
  const { searchParams } = new URL(req.url);
  const budgetId = searchParams.get("budgetId");
  const includeArchived = searchParams.get("includeArchived") === "true";
  const viewMode = parseViewMode(searchParams);

  const budgetIds = await getUserBudgetIds(session.user.id);
  if (budgetIds.length === 0) {
    return successResponse({ goals: [] });
  }

  const activeBudgetId = budgetId || budgetIds[0];
  const userMemberId = await getUserMemberIdInBudget(session.user.id, activeBudgetId);

  const conditions = [inArray(goals.budgetId, budgetIds)];

  if (budgetId) {
    conditions.push(eq(goals.budgetId, budgetId));
  }

  if (!includeArchived) {
    conditions.push(eq(goals.isArchived, false));
  }

  // View mode filtering via the linked account's ownerId
  // Goals with NULL accountId (unlinked) should be visible in "mine" view
  if (userMemberId) {
    const partnerPrivacy = viewMode === "all"
      ? await getPartnerPrivacyLevel(session.user.id, activeBudgetId)
      : undefined;
    const viewCondition = getViewModeCondition({
      viewMode,
      userMemberId,
      ownerField: financialAccounts.ownerId,
      partnerPrivacy,
    });
    if (viewCondition) {
      // Include goals with no linked account (NULL accountId → LEFT JOIN produces NULL ownerId)
      conditions.push(or(viewCondition, isNull(goals.accountId))!);
    }
  }

  const userGoals = await db
    .select({ goal: goals })
    .from(goals)
    .leftJoin(financialAccounts, eq(goals.accountId, financialAccounts.id))
    .where(and(...conditions))
    .orderBy(goals.displayOrder);

  // Get budget-level privacy mode for server-side enforcement
  let privacyMode = "visible";
  if (activeBudgetId) {
    const [budget] = await db
      .select({ privacyMode: budgets.privacyMode })
      .from(budgets)
      .where(eq(budgets.id, activeBudgetId))
      .limit(1);
    privacyMode = budget?.privacyMode || "visible";
  }

  // Server-side privacy enforcement
  const goalsWithMetrics = userGoals
    .map(({ goal }) => {
      const isOtherMemberGoal = goal.memberId !== null && goal.memberId !== userMemberId;

      // "private": completely exclude other member's individual goals
      if (privacyMode === "private" && isOtherMemberGoal) {
        return null;
      }

      const metrics = calculateGoalMetrics(goal);

      // "unified" and "visible": show everything with real amounts
      return { ...goal, ...metrics, isOtherMemberGoal };
    })
    .filter(Boolean);

  return cachedResponse({ goals: goalsWithMetrics, privacyMode }, { maxAge: 30, staleWhileRevalidate: 120 });
});

// POST - Create a new goal
export const POST = withRateLimit(withAuthRequired(async (req, context) => {
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
}), rateLimits.api, "app-goals-post");
