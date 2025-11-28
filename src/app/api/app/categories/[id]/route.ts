import withAuthRequired from "@/lib/auth/withAuthRequired";
import { db } from "@/db";
import { categories, budgetMembers } from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { categoryBehaviorEnum } from "@/db/schema/categories";

const updateCategorySchema = z.object({
  name: z.string().min(1).max(100).optional(),
  icon: z.string().optional(),
  color: z.string().optional(),
  behavior: categoryBehaviorEnum.optional(),
  plannedAmount: z.number().int().optional(),
  targetAmount: z.number().int().optional().nullable(),
  targetDate: z.string().datetime().or(z.date()).optional().nullable(),
  isArchived: z.boolean().optional(),
  displayOrder: z.number().int().optional(),
});

// Helper to get user's budget IDs
async function getUserBudgetIds(userId: string) {
  const memberships = await db
    .select({ budgetId: budgetMembers.budgetId })
    .from(budgetMembers)
    .where(eq(budgetMembers.userId, userId));
  return memberships.map((m) => m.budgetId);
}

// GET - Get a specific category
export const GET = withAuthRequired(async (req, context) => {
  const { session } = context;
  const params = await context.params;
  const categoryId = params.id as string;

  const budgetIds = await getUserBudgetIds(session.user.id);
  if (budgetIds.length === 0) {
    return NextResponse.json({ error: "Category not found" }, { status: 404 });
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
    return NextResponse.json({ error: "Category not found" }, { status: 404 });
  }

  return NextResponse.json({ category });
});

// PATCH - Update a category
export const PATCH = withAuthRequired(async (req, context) => {
  const { session } = context;
  const params = await context.params;
  const categoryId = params.id as string;
  const body = await req.json();

  const budgetIds = await getUserBudgetIds(session.user.id);
  if (budgetIds.length === 0) {
    return NextResponse.json({ error: "Category not found" }, { status: 404 });
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
    return NextResponse.json({ error: "Category not found" }, { status: 404 });
  }

  const validation = updateCategorySchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(
      { error: "Validation failed", details: validation.error.errors },
      { status: 400 }
    );
  }

  const updateData: Record<string, unknown> = {
    ...validation.data,
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

  return NextResponse.json({ category: updatedCategory });
});

// DELETE - Delete a category (soft delete by archiving)
export const DELETE = withAuthRequired(async (req, context) => {
  const { session } = context;
  const params = await context.params;
  const categoryId = params.id as string;

  const budgetIds = await getUserBudgetIds(session.user.id);
  if (budgetIds.length === 0) {
    return NextResponse.json({ error: "Category not found" }, { status: 404 });
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
    return NextResponse.json({ error: "Category not found" }, { status: 404 });
  }

  // Soft delete by archiving
  await db
    .update(categories)
    .set({
      isArchived: true,
      updatedAt: new Date(),
    })
    .where(eq(categories.id, categoryId));

  return NextResponse.json({ success: true });
});
