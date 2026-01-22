import withAuthRequired from "@/shared/lib/auth/withAuthRequired";
import { db } from "@/db";
import { recurringBills } from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { getUserBudgetIds } from "@/shared/lib/api/permissions";
import {
  validationError,
  notFoundError,
  successResponse,
  errorResponse,
} from "@/shared/lib/api/responses";
import { updateRecurringBillSchema, validateFrequencyFields } from "@/shared/lib/validations";

// GET - Get a specific recurring bill
export const GET = withAuthRequired(async (req, context) => {
  const { session } = context;
  const params = await context.params;
  const billId = params.billId as string;

  const budgetIds = await getUserBudgetIds(session.user.id);
  if (budgetIds.length === 0) {
    return notFoundError("Recurring bill");
  }

  const [bill] = await db
    .select()
    .from(recurringBills)
    .where(
      and(
        eq(recurringBills.id, billId),
        inArray(recurringBills.budgetId, budgetIds)
      )
    );

  if (!bill) {
    return notFoundError("Recurring bill");
  }

  return successResponse({ recurringBill: bill });
});

// PATCH - Update a recurring bill
export const PATCH = withAuthRequired(async (req, context) => {
  const { session } = context;
  const params = await context.params;
  const billId = params.billId as string;
  const body = await req.json();

  const budgetIds = await getUserBudgetIds(session.user.id);
  if (budgetIds.length === 0) {
    return notFoundError("Recurring bill");
  }

  const [existingBill] = await db
    .select()
    .from(recurringBills)
    .where(
      and(
        eq(recurringBills.id, billId),
        inArray(recurringBills.budgetId, budgetIds)
      )
    );

  if (!existingBill) {
    return notFoundError("Recurring bill");
  }

  const validation = updateRecurringBillSchema.safeParse(body);
  if (!validation.success) {
    return validationError(validation.error);
  }

  // Validate frequency-dependent fields using merged values (new + existing)
  const frequency = validation.data.frequency ?? existingBill.frequency;
  const dueDay = validation.data.dueDay !== undefined ? validation.data.dueDay : existingBill.dueDay;
  const dueMonth = validation.data.dueMonth !== undefined ? validation.data.dueMonth : existingBill.dueMonth;

  const frequencyValidation = validateFrequencyFields(frequency, dueDay, dueMonth);
  if (!frequencyValidation.valid) {
    return errorResponse(frequencyValidation.error!, 400);
  }

  const updateData = {
    ...validation.data,
    updatedAt: new Date(),
  };

  const [updatedBill] = await db
    .update(recurringBills)
    .set(updateData)
    .where(eq(recurringBills.id, billId))
    .returning();

  return successResponse({ recurringBill: updatedBill });
});

// DELETE - Delete a recurring bill (soft delete by deactivating)
export const DELETE = withAuthRequired(async (req, context) => {
  const { session } = context;
  const params = await context.params;
  const billId = params.billId as string;

  const budgetIds = await getUserBudgetIds(session.user.id);
  if (budgetIds.length === 0) {
    return notFoundError("Recurring bill");
  }

  const [existingBill] = await db
    .select()
    .from(recurringBills)
    .where(
      and(
        eq(recurringBills.id, billId),
        inArray(recurringBills.budgetId, budgetIds)
      )
    );

  if (!existingBill) {
    return notFoundError("Recurring bill");
  }

  // Soft delete by deactivating
  await db
    .update(recurringBills)
    .set({
      isActive: false,
      updatedAt: new Date(),
    })
    .where(eq(recurringBills.id, billId));

  return successResponse({ success: true });
});
