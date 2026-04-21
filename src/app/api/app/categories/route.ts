import withAuthRequired from "@/shared/lib/auth/withAuthRequired";
import { requireActiveSubscription } from "@/shared/lib/auth/withSubscriptionRequired";
import { withRateLimit, rateLimits } from "@/shared/lib/security/rate-limit";
import { db } from "@/db";
import { categories, groups, budgets, budgetMembers } from "@/db/schema";
import { eq, and, inArray, isNull, isNotNull } from "drizzle-orm";
import { capitalizeWords } from "@/shared/lib/utils";
import { getUserBudgetIds, getUserMemberIdInBudget } from "@/shared/lib/api/permissions";
import {
  validationError,
  errorResponse,
  ErrorCodes,
  forbiddenError,
  successResponse,
} from "@/shared/lib/api/responses";
import { suggestEmojiForCategory } from "@/shared/lib/category/suggest-emoji";
import { createCategorySchema } from "@/shared/lib/validations/category.schema";
import { recordAuditLog } from "@/shared/lib/security/audit-log";

// GET - Get categories for user's budgets (with groups)
export const GET = withAuthRequired(async (req, context) => {
  const { session } = context;
  const { searchParams } = new URL(req.url);
  const budgetId = searchParams.get("budgetId");

  const budgetIds = await getUserBudgetIds(session.user.id);
  if (budgetIds.length === 0) {
    return successResponse({ categories: [], groups: [] });
  }

  const targetBudgetIds = budgetId ? [budgetId] : budgetIds;

  // Validate access if specific budgetId requested
  if (budgetId && !budgetIds.includes(budgetId)) {
    return forbiddenError("Budget not found or access denied");
  }

  // Fetch global groups (shared across all budgets)
  const globalGroups = await db
    .select()
    .from(groups)
    .where(isNull(groups.budgetId))
    .orderBy(groups.displayOrder);

  // Fetch personal groups for the target budgets
  const personalGroups = await db
    .select({
      group: groups,
      memberName: budgetMembers.name,
      memberColor: budgetMembers.color,
    })
    .from(groups)
    .innerJoin(budgetMembers, eq(groups.memberId, budgetMembers.id))
    .where(
      and(
        inArray(groups.budgetId, targetBudgetIds),
        isNotNull(groups.memberId)
      )
    )
    .orderBy(groups.displayOrder);

  // Apply privacy filtering per budget — batch fetch to avoid N+1
  // In "private" mode, each member only sees their own personal group
  const budgetPrivacies = await db
    .select({ id: budgets.id, privacyMode: budgets.privacyMode })
    .from(budgets)
    .where(inArray(budgets.id, targetBudgetIds));
  const privacyMap = new Map(budgetPrivacies.map((b) => [b.id, b.privacyMode]));

  // Batch-resolve current member IDs for budgets where privacy = "private"
  const privateBudgetIds = budgetPrivacies
    .filter((b) => b.privacyMode === "private")
    .map((b) => b.id);

  const memberIdMap = new Map<string, string | null>();
  for (const budId of privateBudgetIds) {
    memberIdMap.set(budId, await getUserMemberIdInBudget(session.user.id, budId));
  }

  const visiblePersonalGroupIds = new Set<string>();
  for (const g of personalGroups) {
    const budId = g.group.budgetId!;
    if (privacyMap.get(budId) === "private") {
      if (g.group.memberId === memberIdMap.get(budId)) {
        visiblePersonalGroupIds.add(g.group.id);
      }
    } else {
      visiblePersonalGroupIds.add(g.group.id);
    }
  }

  const visiblePersonalGroups = personalGroups.filter((g) =>
    visiblePersonalGroupIds.has(g.group.id)
  );

  // Build combined group list ordered by displayOrder
  const allGroupsOrdered = [
    ...globalGroups.map((g) => ({ ...g, memberName: null, memberColor: null })),
    ...visiblePersonalGroups.map((g) => ({ ...g.group, memberName: g.memberName, memberColor: g.memberColor })),
  ].sort((a, b) => a.displayOrder - b.displayOrder);

  const allGroupIds = allGroupsOrdered.map((g) => g.id);

  // Fetch categories belonging to visible groups
  const userCategories = await db
    .select({
      category: categories,
      group: groups,
    })
    .from(categories)
    .innerJoin(groups, eq(categories.groupId, groups.id))
    .where(
      and(
        inArray(categories.budgetId, targetBudgetIds),
        inArray(categories.groupId, allGroupIds),
        eq(categories.isArchived, false)
      )
    )
    .orderBy(groups.displayOrder, categories.displayOrder);

  // Group categories by group
  const categoriesByGroup = allGroupsOrdered.map((group) => ({
    ...group,
    categories: userCategories
      .filter((c) => c.group.id === group.id)
      .map((c) => c.category),
  }));

  return successResponse({
    groups: categoriesByGroup,
    flatCategories: userCategories.map((c) => ({
      ...c.category,
      group: c.group,
    })),
  });
});

// POST - Create a new category
export const POST = withRateLimit(withAuthRequired(async (req, context) => {
  const { session } = context;

  // Require active subscription for creating categories
  const subscriptionError = await requireActiveSubscription(session.user.id);
  if (subscriptionError) return subscriptionError;

  const body = await req.json();

  const validation = createCategorySchema.safeParse(body);
  if (!validation.success) {
    return validationError(validation.error);
  }

  const { budgetId, targetDate, suggestIcon, ...categoryData } = validation.data;

  // Check user has access to budget
  const budgetIds = await getUserBudgetIds(session.user.id);
  if (!budgetIds.includes(budgetId)) {
    return forbiddenError("Budget not found or access denied");
  }

  // If creating in a personal group, inherit memberId from the group
  const [targetGroup] = await db
    .select({ memberId: groups.memberId, budgetId: groups.budgetId })
    .from(groups)
    .where(eq(groups.id, categoryData.groupId))
    .limit(1);

  if (!targetGroup) {
    return errorResponse("Grupo não encontrado", 400, { code: ErrorCodes.VALIDATION_ERROR });
  }

  // Personal group: memberId is inherited from the group, not the request
  const resolvedMemberId = targetGroup.memberId ?? categoryData.memberId ?? null;

  // Determine icon: use provided, or suggest if requested, or default
  let finalIcon = categoryData.icon;
  if (!finalIcon && suggestIcon) {
    finalIcon = suggestEmojiForCategory(categoryData.name);
  }

  // Check for duplicate category name in the same scope
  const existingCategory = await db
    .select({ id: categories.id })
    .from(categories)
    .where(
      and(
        eq(categories.budgetId, budgetId),
        resolvedMemberId
          ? eq(categories.memberId, resolvedMemberId)
          : isNull(categories.memberId),
        eq(categories.name, capitalizeWords(categoryData.name)),
        eq(categories.isArchived, false)
      )
    )
    .limit(1);

  if (existingCategory.length > 0) {
    return errorResponse("Ja existe uma categoria com esse nome", 400, {
      code: ErrorCodes.VALIDATION_ERROR,
    });
  }

  // Get display order
  const existingCategories = await db
    .select()
    .from(categories)
    .where(
      and(
        eq(categories.budgetId, budgetId),
        eq(categories.groupId, categoryData.groupId)
      )
    );

  const [newCategory] = await db
    .insert(categories)
    .values({
      ...categoryData,
      memberId: resolvedMemberId,
      name: capitalizeWords(categoryData.name),
      icon: finalIcon,
      budgetId,
      targetDate: targetDate ? new Date(targetDate) : undefined,
      displayOrder: existingCategories.length,
    })
    .returning();

  await recordAuditLog({
    userId: session.user.id,
    action: "category.create",
    resource: "category",
    resourceId: newCategory.id,
    details: {
      budgetId,
      name: newCategory.name,
      groupId: newCategory.groupId,
      memberId: newCategory.memberId,
    },
    req,
  });

  return successResponse({ category: newCategory }, 201);
}), rateLimits.api, "app-categories-post");
