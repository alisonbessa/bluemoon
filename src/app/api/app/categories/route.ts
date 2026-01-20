import withAuthRequired from "@/shared/lib/auth/withAuthRequired";
import { db } from "@/db";
import { categories, groups } from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { z } from "zod";
import { categoryBehaviorEnum } from "@/db/schema/categories";
import { capitalizeWords } from "@/shared/lib/utils";
import { getUserBudgetIds } from "@/shared/lib/api/permissions";
import {
  validationError,
  forbiddenError,
  cachedResponse,
  successResponse,
} from "@/shared/lib/api/responses";
import { suggestEmojiForCategory } from "@/shared/lib/category/suggest-emoji";

const createCategorySchema = z.object({
  budgetId: z.string().uuid(),
  groupId: z.string().uuid(),
  memberId: z.string().uuid().optional(), // For personal "Prazeres" categories
  name: z.string().min(1).max(100),
  icon: z.string().optional().nullable(),
  color: z.string().optional(),
  behavior: categoryBehaviorEnum.default("refill_up"),
  plannedAmount: z.number().int().default(0),
  targetAmount: z.number().int().optional(),
  targetDate: z.string().datetime().or(z.date()).optional(),
  suggestIcon: z.boolean().optional(), // If true, AI will suggest an emoji
});

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

  return cachedResponse({
    groups: categoriesByGroup,
    flatCategories: userCategories.map((c) => ({
      ...c.category,
      group: c.group,
    })),
  });
});

// POST - Create a new category
export const POST = withAuthRequired(async (req, context) => {
  const { session } = context;
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
});
