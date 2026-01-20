import withAuthRequired from "@/shared/lib/auth/withAuthRequired";
import { db } from "@/db";
import { budgets, budgetMembers } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import {
  validationError,
  forbiddenError,
  notFoundError,
  successResponse,
  errorResponse,
  internalError,
} from "@/shared/lib/api/responses";

// GET - Fetch budget info
export const GET = withAuthRequired(async (request, context) => {
  const { session } = context;
  const { searchParams } = new URL(request.url);
  const budgetId = searchParams.get("budgetId");

  if (!budgetId) {
    return errorResponse("budgetId is required", 400);
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
      return forbiddenError("Unauthorized");
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
      return notFoundError("Budget");
    }

    return successResponse({ budget });
  } catch (error) {
    console.error("Error fetching budget:", error);
    return internalError("Failed to fetch budget");
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
    const validation = updateBudgetSchema.safeParse(body);
    if (!validation.success) {
      return validationError(validation.error);
    }
    const { budgetId, name } = validation.data;

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
      return forbiddenError("Only budget owners can update the name");
    }

    // Update budget name
    const [updated] = await db
      .update(budgets)
      .set({ name: name.trim() })
      .where(eq(budgets.id, budgetId))
      .returning();

    return successResponse({ budget: updated });
  } catch (error) {
    console.error("Error updating budget:", error);
    return internalError("Failed to update budget");
  }
});
