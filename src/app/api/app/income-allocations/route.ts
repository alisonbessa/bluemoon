import withAuthRequired from "@/shared/lib/auth/withAuthRequired";
import { db } from "@/db";
import { monthlyIncomeAllocations, incomeSources } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { getUserBudgetIds } from "@/shared/lib/api/permissions";
import {
  validationError,
  forbiddenError,
  notFoundError,
  successResponse,
} from "@/shared/lib/api/responses";

const upsertIncomeAllocationSchema = z.object({
  budgetId: z.string().uuid(),
  incomeSourceId: z.string().uuid(),
  year: z.number().int().min(2020).max(2100),
  month: z.number().int().min(1).max(12),
  planned: z.number().int().min(0),
});

// POST - Upsert an income allocation
export const POST = withAuthRequired(async (req, context) => {
  const { session } = context;
  const body = await req.json();

  const validation = upsertIncomeAllocationSchema.safeParse(body);
  if (!validation.success) {
    return validationError(validation.error);
  }

  const { budgetId, incomeSourceId, year, month, planned } = validation.data;

  // Check user has access to budget
  const budgetIds = await getUserBudgetIds(session.user.id);
  if (!budgetIds.includes(budgetId)) {
    return forbiddenError("Budget not found or access denied");
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
    return notFoundError("Income source");
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

  // Calculate the effective monthly default (same logic as allocations route)
  const frequencyMultiplier =
    incomeSource.frequency === "weekly" ? 4 :
    incomeSource.frequency === "biweekly" ? 2 : 1;
  const defaultMonthlyAmount = (incomeSource.amount || 0) * frequencyMultiplier;

  let result;
  if (existingAllocation) {
    // If planned equals the default monthly amount, delete the override (restore to default)
    if (planned === defaultMonthlyAmount) {
      await db
        .delete(monthlyIncomeAllocations)
        .where(eq(monthlyIncomeAllocations.id, existingAllocation.id));
      return successResponse({ deleted: true, incomeSourceId });
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
    // Don't create if it matches the default monthly amount
    if (planned === defaultMonthlyAmount) {
      return successResponse({ noChange: true, incomeSourceId });
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

  return successResponse({ allocation: result }, existingAllocation ? 200 : 201);
});
