import withAuthRequired from "@/shared/lib/auth/withAuthRequired";
import { requireActiveSubscription } from "@/shared/lib/auth/withSubscriptionRequired";
import { withRateLimit, rateLimits } from "@/shared/lib/security/rate-limit";
import { db } from "@/db";
import { goals, financialAccounts, budgets, goalContributions, goalMemberSettings } from "@/db/schema";
import { eq, and, inArray, or, isNull } from "drizzle-orm";
import { capitalizeWords } from "@/shared/lib/utils";
import { getUserBudgetIds, getUserMemberIdInBudget, getPartnerPrivacyLevel } from "@/shared/lib/api/permissions";
import {
  validationError,
  forbiddenError,
  successResponse,
} from "@/shared/lib/api/responses";
import { createGoalSchema } from "@/shared/lib/validations/goal.schema";
import { calculateGoalMetrics } from "@/shared/lib/goals/calculate-metrics";
import { parseViewMode, getViewModeCondition } from "@/shared/lib/api/view-mode-filter";
import { recordAuditLog } from "@/shared/lib/security/audit-log";

// GET - Get goals for user's budgets
// Goals are filtered by viewMode via their linked account's ownerId
export const GET = withAuthRequired(async (req, context) => {
  const { session } = context;
  const { searchParams } = new URL(req.url);
  const budgetId = searchParams.get("budgetId");
  const includeArchived = searchParams.get("includeArchived") === "true";
  const viewMode = parseViewMode(searchParams);
  const yearParam = searchParams.get("year");
  const monthParam = searchParams.get("month");
  const checkYear = yearParam ? parseInt(yearParam) : null;
  const checkMonth = monthParam ? parseInt(monthParam) : null;

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

  if (userMemberId) {
    const partnerPrivacy = viewMode === "all"
      ? await getPartnerPrivacyLevel(session.user.id, activeBudgetId)
      : undefined;
    const accountCondition = getViewModeCondition({
      viewMode,
      userMemberId,
      ownerField: financialAccounts.ownerId,
      partnerPrivacy,
    });

    if (viewMode === "mine") {
      conditions.push(
        or(
          eq(goals.memberId, userMemberId),
          isNull(goals.accountId),
        )!
      );
    } else if (viewMode === "shared") {
      conditions.push(isNull(goals.memberId));
    } else if (accountCondition) {
      conditions.push(or(accountCondition, isNull(goals.memberId), isNull(goals.accountId))!);
    }
  }

  const userGoals = await db
    .select({ goal: goals })
    .from(goals)
    .leftJoin(financialAccounts, eq(goals.accountId, financialAccounts.id))
    .where(and(...conditions))
    .orderBy(goals.displayOrder);

  if (userGoals.length === 0) {
    return successResponse({ goals: [], privacyMode: "visible" });
  }

  const goalIds = userGoals.map(({ goal }) => goal.id);

  // Run in parallel: privacy check, member settings, contribution status
  const [budgetRow, allMemberSettings, confirmedContributions] = await Promise.all([
    db.select({ privacyMode: budgets.privacyMode })
      .from(budgets)
      .where(eq(budgets.id, activeBudgetId))
      .limit(1),

    db.select()
      .from(goalMemberSettings)
      .where(inArray(goalMemberSettings.goalId, goalIds)),

    checkYear && checkMonth
      ? db.select({ goalId: goalContributions.goalId, memberId: goalContributions.memberId })
          .from(goalContributions)
          .where(and(
            inArray(goalContributions.goalId, goalIds),
            eq(goalContributions.year, checkYear),
            eq(goalContributions.month, checkMonth)
          ))
      : Promise.resolve([]),
  ]);

  const privacyMode = budgetRow[0]?.privacyMode || "visible";

  // Index member settings and confirmed contributions by goalId
  const settingsByGoal = new Map<string, typeof allMemberSettings>();
  for (const s of allMemberSettings) {
    if (!settingsByGoal.has(s.goalId)) settingsByGoal.set(s.goalId, []);
    settingsByGoal.get(s.goalId)!.push(s);
  }

  // confirmedThisMonth = current user's member already contributed this month
  const confirmedByGoal = new Set(
    (confirmedContributions as Array<{ goalId: string; memberId: string | null }>)
      .filter((c) => c.memberId === userMemberId || c.memberId === null)
      .map((c) => c.goalId)
  );

  // Server-side privacy enforcement
  const goalsWithMetrics = userGoals
    .map(({ goal }) => {
      const isOtherMemberGoal = goal.memberId !== null && goal.memberId !== userMemberId;

      if (privacyMode === "private" && isOtherMemberGoal) {
        return null;
      }

      const metrics = calculateGoalMetrics(goal);
      const memberSettings = settingsByGoal.get(goal.id) ?? [];
      const mySettings = userMemberId
        ? memberSettings.find((s) => s.memberId === userMemberId) ?? null
        : null;
      const confirmedThisMonth = confirmedByGoal.has(goal.id);

      return { ...goal, ...metrics, isOtherMemberGoal, memberSettings, mySettings, confirmedThisMonth };
    })
    .filter(Boolean);

  return successResponse({ goals: goalsWithMetrics, privacyMode });
});

// POST - Create a new goal
export const POST = withRateLimit(withAuthRequired(async (req, context) => {
  const { session } = context;

  const subscriptionError = await requireActiveSubscription(session.user.id);
  if (subscriptionError) return subscriptionError;

  const body = await req.json();

  const validation = createGoalSchema.safeParse(body);
  if (!validation.success) {
    return validationError(validation.error);
  }

  const { budgetId, targetDate, initialAmount, accountId, fromAccountId, memberId, memberSettings, ...goalData } = validation.data;

  const budgetIds = await getUserBudgetIds(session.user.id);
  if (!budgetIds.includes(budgetId)) {
    return forbiddenError("Budget not found or access denied");
  }

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
      fromAccountId: fromAccountId ?? null,
      targetDate: new Date(targetDate),
      currentAmount: initialAmount || 0,
      displayOrder: existingGoals.length,
    })
    .returning();

  // Save per-member settings if provided (shared Duo goals)
  if (memberSettings && memberSettings.length > 0) {
    await db.insert(goalMemberSettings).values(
      memberSettings.map((s) => ({
        goalId: newGoal.id,
        memberId: s.memberId,
        fromAccountId: s.fromAccountId ?? null,
        monthlyAmount: s.monthlyAmount ?? null,
      }))
    ).onConflictDoUpdate({
      target: [goalMemberSettings.goalId, goalMemberSettings.memberId],
      set: {
        fromAccountId: goalMemberSettings.fromAccountId,
        monthlyAmount: goalMemberSettings.monthlyAmount,
        updatedAt: new Date(),
      },
    });
  }

  await recordAuditLog({
    userId: session.user.id,
    action: "goal.create",
    resource: "goal",
    resourceId: newGoal.id,
    details: { budgetId, name: newGoal.name, targetAmount: newGoal.targetAmount },
    req,
  });

  return successResponse(
    {
      goal: {
        ...newGoal,
        ...calculateGoalMetrics(newGoal),
        memberSettings: memberSettings ?? [],
      },
    },
    201
  );
}), rateLimits.api, "app-goals-post");
