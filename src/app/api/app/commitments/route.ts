import withAuthRequired from "@/shared/lib/auth/withAuthRequired";
import { db } from "@/db";
import { categories, groups, monthlyAllocations } from "@/db/schema";
import { eq, and, gte, lte, isNotNull } from "drizzle-orm";
import { getUserBudgetIds, getUserMemberIdInBudget, getPartnerPrivacyLevel } from "@/shared/lib/api/permissions";
import {
  forbiddenError,
  successResponse,
  errorResponse,
} from "@/shared/lib/api/responses";
import { parseViewMode, getViewModeCondition } from "@/shared/lib/api/view-mode-filter";

// GET - Get upcoming commitments (categories with targetDate in the next 30 days)
export const GET = withAuthRequired(async (req, context) => {
  const { session } = context;
  const { searchParams } = new URL(req.url);
  const budgetId = searchParams.get("budgetId");
  const daysAhead = parseInt(searchParams.get("days") || "30");
  const viewMode = parseViewMode(searchParams);

  if (!budgetId) {
    return errorResponse("budgetId is required", 400);
  }

  const budgetIds = await getUserBudgetIds(session.user.id);
  if (!budgetIds.includes(budgetId)) {
    return forbiddenError("Budget not found or access denied");
  }

  // Get user's member ID and partner privacy for view mode filtering
  const userMemberId = await getUserMemberIdInBudget(session.user.id, budgetId);
  const partnerPrivacy = viewMode === "all" && userMemberId
    ? await getPartnerPrivacyLevel(session.user.id, budgetId)
    : undefined;

  // Categories with NULL memberId are shared — visible in "mine" view
  const categoryViewCondition = userMemberId
    ? getViewModeCondition({
        viewMode,
        userMemberId,
        ownerField: categories.memberId,
        partnerPrivacy,
        includeSharedInMine: true,
      })
    : undefined;

  const now = new Date();
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + daysAhead);

  // Get categories with targetDate in the upcoming period (filtered by viewMode)
  const upcomingCommitments = await db
    .select({
      category: categories,
      group: groups,
    })
    .from(categories)
    .innerJoin(groups, eq(categories.groupId, groups.id))
    .where(
      and(
        eq(categories.budgetId, budgetId),
        eq(categories.isArchived, false),
        isNotNull(categories.targetDate),
        gte(categories.targetDate, now),
        lte(categories.targetDate, futureDate),
        ...(categoryViewCondition ? [categoryViewCondition] : [])
      )
    )
    .orderBy(categories.targetDate);

  // Get current month's allocations for these categories
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const categoryIds = upcomingCommitments.map((c) => c.category.id);

  const allocations = categoryIds.length > 0
    ? await db
        .select()
        .from(monthlyAllocations)
        .where(
          and(
            eq(monthlyAllocations.budgetId, budgetId),
            eq(monthlyAllocations.year, year),
            eq(monthlyAllocations.month, month)
          )
        )
    : [];

  const allocationsMap = new Map(allocations.map((a) => [a.categoryId, a.allocated || 0]));

  const commitments = upcomingCommitments.map(({ category, group }) => ({
    id: category.id,
    name: category.name,
    icon: category.icon,
    targetDate: category.targetDate,
    allocated: allocationsMap.get(category.id) || category.plannedAmount || 0,
    group: {
      id: group.id,
      name: group.name,
      code: group.code,
    },
  }));

  return successResponse({
    commitments,
    period: {
      from: now.toISOString(),
      to: futureDate.toISOString(),
      days: daysAhead,
    },
  });
});
