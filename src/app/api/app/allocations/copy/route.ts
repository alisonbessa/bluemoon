import withAuthRequired from "@/lib/auth/withAuthRequired";
import { db } from "@/db";
import { monthlyAllocations, budgetMembers, categories } from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

const copyAllocationsSchema = z.object({
  budgetId: z.string().uuid(),
  fromYear: z.number().int().min(2020).max(2100),
  fromMonth: z.number().int().min(1).max(12),
  toYear: z.number().int().min(2020).max(2100),
  toMonth: z.number().int().min(1).max(12),
  overwrite: z.boolean().optional().default(false),
});

// Helper to get user's budget IDs
async function getUserBudgetIds(userId: string) {
  const memberships = await db
    .select({ budgetId: budgetMembers.budgetId })
    .from(budgetMembers)
    .where(eq(budgetMembers.userId, userId));
  return memberships.map((m) => m.budgetId);
}

// POST - Copy allocations from one month to another
export const POST = withAuthRequired(async (req, context) => {
  const { session } = context;
  const body = await req.json();

  const validation = copyAllocationsSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(
      { error: "Validation failed", details: validation.error.errors },
      { status: 400 }
    );
  }

  const { budgetId, fromYear, fromMonth, toYear, toMonth, overwrite } = validation.data;

  // Check user has access to budget
  const budgetIds = await getUserBudgetIds(session.user.id);
  if (!budgetIds.includes(budgetId)) {
    return NextResponse.json(
      { error: "Budget not found or access denied" },
      { status: 404 }
    );
  }

  // Validate not copying to same month
  if (fromYear === toYear && fromMonth === toMonth) {
    return NextResponse.json(
      { error: "Cannot copy to the same month" },
      { status: 400 }
    );
  }

  // Get source allocations
  const sourceAllocations = await db
    .select()
    .from(monthlyAllocations)
    .where(
      and(
        eq(monthlyAllocations.budgetId, budgetId),
        eq(monthlyAllocations.year, fromYear),
        eq(monthlyAllocations.month, fromMonth)
      )
    );

  if (sourceAllocations.length === 0) {
    // If no allocations in source month, try to get default amounts from categories
    const budgetCategories = await db
      .select()
      .from(categories)
      .where(
        and(
          eq(categories.budgetId, budgetId),
          eq(categories.isArchived, false)
        )
      );

    if (budgetCategories.length === 0) {
      return NextResponse.json(
        { error: "No categories or allocations to copy from" },
        { status: 404 }
      );
    }

    // Use default planned amounts from categories
    const allocationsToCreate = budgetCategories
      .filter((cat) => cat.plannedAmount && cat.plannedAmount > 0)
      .map((cat) => ({
        budgetId,
        categoryId: cat.id,
        year: toYear,
        month: toMonth,
        allocated: cat.plannedAmount || 0,
        carriedOver: 0,
      }));

    if (allocationsToCreate.length > 0) {
      // Check for existing allocations
      const existingAllocations = await db
        .select()
        .from(monthlyAllocations)
        .where(
          and(
            eq(monthlyAllocations.budgetId, budgetId),
            eq(monthlyAllocations.year, toYear),
            eq(monthlyAllocations.month, toMonth)
          )
        );

      if (existingAllocations.length > 0 && !overwrite) {
        return NextResponse.json(
          {
            error: "Target month already has allocations",
            existingCount: existingAllocations.length,
            requiresOverwrite: true,
          },
          { status: 409 }
        );
      }

      if (overwrite && existingAllocations.length > 0) {
        // Delete existing allocations
        await db
          .delete(monthlyAllocations)
          .where(
            and(
              eq(monthlyAllocations.budgetId, budgetId),
              eq(monthlyAllocations.year, toYear),
              eq(monthlyAllocations.month, toMonth)
            )
          );
      }

      await db.insert(monthlyAllocations).values(allocationsToCreate);

      return NextResponse.json({
        success: true,
        copiedCount: allocationsToCreate.length,
        source: "category_defaults",
      });
    }

    return NextResponse.json(
      { error: "No allocations or category defaults to copy" },
      { status: 404 }
    );
  }

  // Check for existing allocations in target month
  const existingAllocations = await db
    .select()
    .from(monthlyAllocations)
    .where(
      and(
        eq(monthlyAllocations.budgetId, budgetId),
        eq(monthlyAllocations.year, toYear),
        eq(monthlyAllocations.month, toMonth)
      )
    );

  if (existingAllocations.length > 0 && !overwrite) {
    return NextResponse.json(
      {
        error: "Target month already has allocations",
        existingCount: existingAllocations.length,
        requiresOverwrite: true,
      },
      { status: 409 }
    );
  }

  // Delete existing if overwriting
  if (overwrite && existingAllocations.length > 0) {
    await db
      .delete(monthlyAllocations)
      .where(
        and(
          eq(monthlyAllocations.budgetId, budgetId),
          eq(monthlyAllocations.year, toYear),
          eq(monthlyAllocations.month, toMonth)
        )
      );
  }

  // Create new allocations from source
  const allocationsToCreate = sourceAllocations.map((alloc) => ({
    budgetId,
    categoryId: alloc.categoryId,
    year: toYear,
    month: toMonth,
    allocated: alloc.allocated,
    carriedOver: 0, // Reset carried over for new month
  }));

  await db.insert(monthlyAllocations).values(allocationsToCreate);

  return NextResponse.json({
    success: true,
    copiedCount: allocationsToCreate.length,
    source: "previous_month",
  });
});
