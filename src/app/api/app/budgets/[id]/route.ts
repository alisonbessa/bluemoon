import withAuthRequired from "@/lib/auth/withAuthRequired";
import { db } from "@/db";
import { budgets, budgetMembers } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

const updateBudgetSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().optional(),
  currency: z.string().optional(),
});

// Helper to check if user has access to budget
async function checkBudgetAccess(budgetId: string, userId: string) {
  const membership = await db
    .select()
    .from(budgetMembers)
    .where(
      and(
        eq(budgetMembers.budgetId, budgetId),
        eq(budgetMembers.userId, userId)
      )
    )
    .limit(1);

  return membership[0] || null;
}

// GET - Get a specific budget with details
export const GET = withAuthRequired(async (req, context) => {
  const { session } = context;
  const params = await context.params;
  const budgetId = params.id as string;

  const membership = await checkBudgetAccess(budgetId, session.user.id);
  if (!membership) {
    return NextResponse.json({ error: "Budget not found" }, { status: 404 });
  }

  const [budget] = await db
    .select()
    .from(budgets)
    .where(eq(budgets.id, budgetId));

  if (!budget) {
    return NextResponse.json({ error: "Budget not found" }, { status: 404 });
  }

  return NextResponse.json({
    budget,
    membership,
  });
});

// PATCH - Update a budget
export const PATCH = withAuthRequired(async (req, context) => {
  const { session } = context;
  const params = await context.params;
  const budgetId = params.id as string;
  const body = await req.json();

  const membership = await checkBudgetAccess(budgetId, session.user.id);
  if (!membership) {
    return NextResponse.json({ error: "Budget not found" }, { status: 404 });
  }

  // Only owner can update budget
  if (membership.type !== "owner") {
    return NextResponse.json(
      { error: "Only the owner can update the budget" },
      { status: 403 }
    );
  }

  const validation = updateBudgetSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(
      { error: "Validation failed", details: validation.error.errors },
      { status: 400 }
    );
  }

  const [updatedBudget] = await db
    .update(budgets)
    .set({
      ...validation.data,
      updatedAt: new Date(),
    })
    .where(eq(budgets.id, budgetId))
    .returning();

  return NextResponse.json({ budget: updatedBudget });
});

// DELETE - Delete a budget
export const DELETE = withAuthRequired(async (req, context) => {
  const { session } = context;
  const params = await context.params;
  const budgetId = params.id as string;

  const membership = await checkBudgetAccess(budgetId, session.user.id);
  if (!membership) {
    return NextResponse.json({ error: "Budget not found" }, { status: 404 });
  }

  // Only owner can delete budget
  if (membership.type !== "owner") {
    return NextResponse.json(
      { error: "Only the owner can delete the budget" },
      { status: 403 }
    );
  }

  await db.delete(budgets).where(eq(budgets.id, budgetId));

  return NextResponse.json({ success: true });
});
