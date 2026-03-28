import withAuthRequired from "@/shared/lib/auth/withAuthRequired";
import { requireActiveSubscription } from "@/shared/lib/auth/withSubscriptionRequired";
import { withRateLimit, rateLimits } from "@/shared/lib/security/rate-limit";
import { db } from "@/db";
import { categories, groups } from "@/db/schema";
import { eq, and, inArray, isNull } from "drizzle-orm";
import { capitalizeWords } from "@/shared/lib/utils";
import { getUserBudgetIds } from "@/shared/lib/api/permissions";
import {
  validationError,
  errorResponse,
  ErrorCodes,
  forbiddenError,
  successResponse,
} from "@/shared/lib/api/responses";
import { suggestEmojiForCategory } from "@/shared/lib/category/suggest-emoji";
import { createCategorySchema } from "@/shared/lib/validations/category.schema";

// GET - Get categories for user's budgets (with groups)
export const GET = withAuthRequired(async (req, context) => {
  const { session } = context;
  const { searchParams } = new URL(req.url);
  const budgetId = searchParams.get("budgetId");

  const budgetIds = await getUserBudgetIds(session.user.id);
  if (budgetIds.length === 0) {
    return successResponse({ categories: [], groups: [] });
  }

  // Get all groups
  const allGroups = await db.select().from(groups).orderBy(groups.displayOrder);

  // Get categories with group info
  const userCategories = await db
    .select({
      category: categories,
      group: groups,
    })
    .from(categories)
    .innerJoin(groups, eq(categories.groupId, groups.id))
    .where(
      budgetId
        ? and(
            eq(categories.budgetId, budgetId),
            inArray(categories.budgetId, budgetIds),
            eq(categories.isArchived, false)
          )
        : and(
            inArray(categories.budgetId, budgetIds),
            eq(categories.isArchived, false)
          )
    )
    .orderBy(groups.displayOrder, categories.displayOrder);

  // Group categories by group
  const categoriesByGroup = allGroups.map((group) => ({
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
        categoryData.memberId
          ? eq(categories.memberId, categoryData.memberId)
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
      name: capitalizeWords(categoryData.name),
      icon: finalIcon,
      budgetId,
      targetDate: targetDate ? new Date(targetDate) : undefined,
      displayOrder: existingCategories.length,
    })
    .returning();

  return successResponse({ category: newCategory }, 201);
}), rateLimits.api, "app-categories-post");
