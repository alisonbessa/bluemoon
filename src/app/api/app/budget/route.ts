import withAuthRequired from "@/shared/lib/auth/withAuthRequired";
import { db } from "@/db";
import { budgets, budgetMembers } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

// GET - Fetch budget info
export const GET = withAuthRequired(async (request, context) => {
  const { session } = context;
  const { searchParams } = new URL(request.url);
  const budgetId = searchParams.get("budgetId");

  if (!budgetId) {
    return NextResponse.json({ error: "budgetId is required" }, { status: 400 });
  }

  try {
    // Verify user has access to this budget
    const membership = await db
      .select()
      .from(budgetMembers)
      .where(
        and(
          eq(budgetMembers.budgetId, budgetId),
          eq(budgetMembers.userId, session.user.id)
        )
      )
      .limit(1);

    if (membership.length === 0) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Fetch budget
    const [budget] = await db
      .select({
        id: budgets.id,
        name: budgets.name,
        createdAt: budgets.createdAt,
      })
      .from(budgets)
      .where(eq(budgets.id, budgetId))
      .limit(1);

    if (!budget) {
      return NextResponse.json({ error: "Budget not found" }, { status: 404 });
    }

    return NextResponse.json({ budget });
  } catch (error) {
    console.error("Error fetching budget:", error);
    return NextResponse.json(
      { error: "Failed to fetch budget" },
      { status: 500 }
    );
  }
});

const updateBudgetSchema = z.object({
  budgetId: z.string().uuid(),
  name: z.string().min(1).max(100),
});

// PATCH - Update budget name
export const PATCH = withAuthRequired(async (request, context) => {
  const { session } = context;

  try {
    const body = await request.json();
    const { budgetId, name } = updateBudgetSchema.parse(body);

    // Verify user is owner of this budget
    const membership = await db
      .select()
      .from(budgetMembers)
      .where(
        and(
          eq(budgetMembers.budgetId, budgetId),
          eq(budgetMembers.userId, session.user.id),
          eq(budgetMembers.type, "owner")
        )
      )
      .limit(1);

    if (membership.length === 0) {
      return NextResponse.json(
        { error: "Only budget owners can update the name" },
        { status: 403 }
      );
    }

    // Update budget name
    const [updated] = await db
      .update(budgets)
      .set({ name: name.trim() })
      .where(eq(budgets.id, budgetId))
      .returning();

    return NextResponse.json({ budget: updated });
  } catch (error) {
    console.error("Error updating budget:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid data", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to update budget" },
      { status: 500 }
    );
  }
});
