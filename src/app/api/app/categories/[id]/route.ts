import withAuthRequired from "@/shared/lib/auth/withAuthRequired";
import { db } from "@/db";
import { categories } from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { z } from "zod";
import { categoryBehaviorEnum } from "@/db/schema/categories";
import { capitalizeWords } from "@/shared/lib/utils";
import { getUserBudgetIds } from "@/shared/lib/api/permissions";
import {
  validationError,
  notFoundError,
  successResponse,
} from "@/shared/lib/api/responses";

const updateCategorySchema = z.object({
  name: z.string().min(1).max(100).optional(),
  icon: z.string().optional(),
  color: z.string().optional(),
  behavior: categoryBehaviorEnum.optional(),
  plannedAmount: z.number().int().optional(),
  dueDay: z.number().int().min(1).max(31).optional().nullable(),
  targetAmount: z.number().int().optional().nullable(),
  targetDate: z.string().datetime().or(z.date()).optional().nullable(),
  isArchived: z.boolean().optional(),
  displayOrder: z.number().int().optional(),
});

// GET - Get a specific category
export const GET = withAuthRequired(async (req, context) => {
  const { session } = context;
  const params = await context.params;
  const categoryId = params.id as string;

  const budgetIds = await getUserBudgetIds(session.user.id);
  if (budgetIds.length === 0) {
    return notFoundError("Category");
  }

  const [category] = await db
    .select()
    .from(categories)
    .where(
      and(
        eq(categories.id, categoryId),
        inArray(categories.budgetId, budgetIds)
      )
    );

  if (!category) {
    return notFoundError("Category");
  }

  return successResponse({ category });
});

// PATCH - Update a category
export const PATCH = withAuthRequired(async (req, context) => {
  const { session } = context;
  const params = await context.params;
  const categoryId = params.id as string;
  const body = await req.json();

  const budgetIds = await getUserBudgetIds(session.user.id);
  if (budgetIds.length === 0) {
    return notFoundError("Category");
  }

  const [existingCategory] = await db
    .select()
    .from(categories)
    .where(
      and(
        eq(categories.id, categoryId),
        inArray(categories.budgetId, budgetIds)
      )
    );

  if (!existingCategory) {
    return notFoundError("Category");
  }

  const validation = updateCategorySchema.safeParse(body);
  if (!validation.success) {
    return validationError(validation.error);
  }

  const updateData: Record<string, unknown> = {
    ...validation.data,
    ...(validation.data.name && { name: capitalizeWords(validation.data.name) }),
    updatedAt: new Date(),
  };

  // Handle date conversion
  if (validation.data.targetDate !== undefined) {
    updateData.targetDate = validation.data.targetDate
      ? new Date(validation.data.targetDate)
      : null;
  }

  const [updatedCategory] = await db
    .update(categories)
    .set(updateData)
    .where(eq(categories.id, categoryId))
    .returning();

  return successResponse({ category: updatedCategory });
});

// DELETE - Delete a category (soft delete by archiving)
export const DELETE = withAuthRequired(async (req, context) => {
  const { session } = context;
  const params = await context.params;
  const categoryId = params.id as string;

  const budgetIds = await getUserBudgetIds(session.user.id);
  if (budgetIds.length === 0) {
    return notFoundError("Category");
  }

  const [existingCategory] = await db
    .select()
    .from(categories)
    .where(
      and(
        eq(categories.id, categoryId),
        inArray(categories.budgetId, budgetIds)
      )
    );

  if (!existingCategory) {
    return notFoundError("Category");
  }

  // Soft delete by archiving
  await db
    .update(categories)
    .set({
      isArchived: true,
      updatedAt: new Date(),
    })
    .where(eq(categories.id, categoryId));

  return successResponse({ success: true });
});
