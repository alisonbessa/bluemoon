import withAuthRequired from "@/shared/lib/auth/withAuthRequired";
import { db } from "@/db";
import { incomeSources } from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { capitalizeWords } from "@/shared/lib/utils";
import { getUserBudgetIds } from "@/shared/lib/api/permissions";
import {
  validationError,
  notFoundError,
  successResponse,
  errorResponse,
} from "@/shared/lib/api/responses";
import { updateIncomeSourceSchema, validateIncomeFrequencyFields } from "@/shared/lib/validations";

// GET - Get a specific income source
export const GET = withAuthRequired(async (req, context) => {
  const { session } = context;
  const params = await context.params;
  const sourceId = params.id as string;

  const budgetIds = await getUserBudgetIds(session.user.id);
  if (budgetIds.length === 0) {
    return notFoundError("Income source");
  }

  const [source] = await db
    .select()
    .from(incomeSources)
    .where(
      and(
        eq(incomeSources.id, sourceId),
        inArray(incomeSources.budgetId, budgetIds)
      )
    );

  if (!source) {
    return notFoundError("Income source");
  }

  return successResponse({ incomeSource: source });
});

// PATCH - Update an income source
export const PATCH = withAuthRequired(async (req, context) => {
  const { session } = context;
  const params = await context.params;
  const sourceId = params.id as string;
  const body = await req.json();

  const budgetIds = await getUserBudgetIds(session.user.id);
  if (budgetIds.length === 0) {
    return notFoundError("Income source");
  }

  const [existingSource] = await db
    .select()
    .from(incomeSources)
    .where(
      and(
        eq(incomeSources.id, sourceId),
        inArray(incomeSources.budgetId, budgetIds)
      )
    );

  if (!existingSource) {
    return notFoundError("Income source");
  }

  const validation = updateIncomeSourceSchema.safeParse(body);
  if (!validation.success) {
    return validationError(validation.error);
  }

  // Validate frequency-dependent fields
  // Use new frequency if provided, otherwise use existing frequency
  const effectiveFrequency = validation.data.frequency ?? existingSource.frequency ?? "monthly";
  const effectiveDayOfMonth = validation.data.dayOfMonth !== undefined
    ? validation.data.dayOfMonth
    : existingSource.dayOfMonth;

  const frequencyValidation = validateIncomeFrequencyFields(effectiveFrequency, effectiveDayOfMonth);
  if (!frequencyValidation.valid) {
    return errorResponse(frequencyValidation.error!, 400);
  }

  const updateData = {
    ...validation.data,
    ...(validation.data.name && { name: capitalizeWords(validation.data.name) }),
    updatedAt: new Date(),
  };

  const [updatedSource] = await db
    .update(incomeSources)
    .set(updateData)
    .where(eq(incomeSources.id, sourceId))
    .returning();

  return successResponse({ incomeSource: updatedSource });
});

// DELETE - Delete an income source (soft delete by deactivating)
export const DELETE = withAuthRequired(async (req, context) => {
  const { session } = context;
  const params = await context.params;
  const sourceId = params.id as string;

  const budgetIds = await getUserBudgetIds(session.user.id);
  if (budgetIds.length === 0) {
    return notFoundError("Income source");
  }

  const [existingSource] = await db
    .select()
    .from(incomeSources)
    .where(
      and(
        eq(incomeSources.id, sourceId),
        inArray(incomeSources.budgetId, budgetIds)
      )
    );

  if (!existingSource) {
    return notFoundError("Income source");
  }

  // Soft delete by deactivating
  await db
    .update(incomeSources)
    .set({
      isActive: false,
      updatedAt: new Date(),
    })
    .where(eq(incomeSources.id, sourceId));

  return successResponse({ success: true });
});
