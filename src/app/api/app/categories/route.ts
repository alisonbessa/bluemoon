import withAuthRequired from "@/lib/auth/withAuthRequired";
import { db } from "@/db";
import { categories, budgetMembers, groups } from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { categoryBehaviorEnum } from "@/db/schema/categories";

const createCategorySchema = z.object({
  budgetId: z.string().uuid(),
  groupId: z.string().uuid(),
  memberId: z.string().uuid().optional(), // For personal "Prazeres" categories
  name: z.string().min(1).max(100),
  icon: z.string().optional(),
  color: z.string().optional(),
  behavior: categoryBehaviorEnum.default("refill_up"),
  plannedAmount: z.number().int().default(0),
  targetAmount: z.number().int().optional(),
  targetDate: z.string().datetime().or(z.date()).optional(),
});

// Helper to get user's budget IDs
async function getUserBudgetIds(userId: string) {
  const memberships = await db
    .select({ budgetId: budgetMembers.budgetId })
    .from(budgetMembers)
    .where(eq(budgetMembers.userId, userId));
  return memberships.map((m) => m.budgetId);
}

// GET - Get categories for user's budgets (with groups)
export const GET = withAuthRequired(async (req, context) => {
  const { session } = context;
  const { searchParams } = new URL(req.url);
  const budgetId = searchParams.get("budgetId");

  const budgetIds = await getUserBudgetIds(session.user.id);
  if (budgetIds.length === 0) {
    return NextResponse.json({ categories: [], groups: [] });
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

  return NextResponse.json({
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
    return NextResponse.json(
      { error: "Validation failed", details: validation.error.errors },
      { status: 400 }
    );
  }

  const { budgetId, targetDate, ...categoryData } = validation.data;

  // Check user has access to budget
  const budgetIds = await getUserBudgetIds(session.user.id);
  if (!budgetIds.includes(budgetId)) {
    return NextResponse.json(
      { error: "Budget not found or access denied" },
      { status: 404 }
    );
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
      budgetId,
      targetDate: targetDate ? new Date(targetDate) : undefined,
      displayOrder: existingCategories.length,
    })
    .returning();

  return NextResponse.json({ category: newCategory }, { status: 201 });
});
