import withAuthRequired from "@/lib/auth/withAuthRequired";
import { db } from "@/db";
import { monthlyIncomeAllocations, budgetMembers, incomeSources } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

const upsertIncomeAllocationSchema = z.object({
  budgetId: z.string().uuid(),
  incomeSourceId: z.string().uuid(),
  year: z.number().int().min(2020).max(2100),
  month: z.number().int().min(1).max(12),
  planned: z.number().int().min(0),
});

// Helper to get user's budget IDs
async function getUserBudgetIds(userId: string) {
  const memberships = await db
    .select({ budgetId: budgetMembers.budgetId })
    .from(budgetMembers)
    .where(eq(budgetMembers.userId, userId));
  return memberships.map((m) => m.budgetId);
}

// POST - Upsert an income allocation
export const POST = withAuthRequired(async (req, context) => {
  const { session } = context;
  const body = await req.json();

  const validation = upsertIncomeAllocationSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(
      { error: "Validation failed", details: validation.error.errors },
      { status: 400 }
    );
  }

  const { budgetId, incomeSourceId, year, month, planned } = validation.data;

  // Check user has access to budget
  const budgetIds = await getUserBudgetIds(session.user.id);
  if (!budgetIds.includes(budgetId)) {
    return NextResponse.json(
      { error: "Budget not found or access denied" },
      { status: 404 }
    );
  }

  // Verify income source belongs to budget
  const [incomeSource] = await db
    .select()
    .from(incomeSources)
    .where(
      and(
        eq(incomeSources.id, incomeSourceId),
        eq(incomeSources.budgetId, budgetId)
      )
    );

  if (!incomeSource) {
    return NextResponse.json({ error: "Income source not found" }, { status: 404 });
  }

  // Upsert allocation
  const [existingAllocation] = await db
    .select()
    .from(monthlyIncomeAllocations)
    .where(
      and(
        eq(monthlyIncomeAllocations.budgetId, budgetId),
        eq(monthlyIncomeAllocations.incomeSourceId, incomeSourceId),
        eq(monthlyIncomeAllocations.year, year),
        eq(monthlyIncomeAllocations.month, month)
      )
    );

  let result;
  if (existingAllocation) {
    // If planned equals the default amount, delete the override
    if (planned === incomeSource.amount) {
      await db
        .delete(monthlyIncomeAllocations)
        .where(eq(monthlyIncomeAllocations.id, existingAllocation.id));
      return NextResponse.json({ deleted: true, incomeSourceId }, { status: 200 });
    }

    [result] = await db
      .update(monthlyIncomeAllocations)
      .set({
        planned,
        updatedAt: new Date(),
      })
      .where(eq(monthlyIncomeAllocations.id, existingAllocation.id))
      .returning();
  } else {
    // Don't create if it matches the default
    if (planned === incomeSource.amount) {
      return NextResponse.json({ noChange: true, incomeSourceId }, { status: 200 });
    }

    [result] = await db
      .insert(monthlyIncomeAllocations)
      .values({
        budgetId,
        incomeSourceId,
        year,
        month,
        planned,
      })
      .returning();
  }

  return NextResponse.json({ allocation: result }, { status: existingAllocation ? 200 : 201 });
});
