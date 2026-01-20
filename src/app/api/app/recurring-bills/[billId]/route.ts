import withAuthRequired from "@/shared/lib/auth/withAuthRequired";
import { db } from "@/db";
import { recurringBills } from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { z } from "zod";
import { recurringBillFrequencyEnum } from "@/db/schema/recurring-bills";
import { getUserBudgetIds } from "@/shared/lib/api/permissions";
import {
  validationError,
  notFoundError,
  successResponse,
  errorResponse,
} from "@/shared/lib/api/responses";

const updateRecurringBillSchema = z.object({
  categoryId: z.string().uuid().optional(),
  accountId: z.string().uuid().optional(), // pode mudar a conta, mas é obrigatório ter uma
  name: z.string().min(1).max(100).optional(),
  amount: z.number().int().min(0).optional(),
  frequency: recurringBillFrequencyEnum.optional(),
  dueDay: z.number().int().min(0).max(31).optional().nullable(), // 0-6 for weekly, 1-31 for monthly/yearly
  dueMonth: z.number().int().min(1).max(12).optional().nullable(),
  isAutoDebit: z.boolean().optional(),
  isVariable: z.boolean().optional(),
  isActive: z.boolean().optional(),
  displayOrder: z.number().int().optional(),
});

// Helper to validate frequency-dependent fields
function validateFrequencyFields(
  frequency: string,
  dueDay: number | null | undefined,
  dueMonth: number | null | undefined
): { valid: boolean; error?: string } {
  // Yearly requires dueMonth
  if (frequency === "yearly" && !dueMonth) {
    return { valid: false, error: "Despesa anual requer mês de vencimento" };
  }

  // Weekly dueDay should be 0-6 (day of week)
  if (frequency === "weekly" && dueDay !== null && dueDay !== undefined) {
    if (dueDay < 0 || dueDay > 6) {
      return { valid: false, error: "Para semanal, dia deve ser 0 (Domingo) a 6 (Sábado)" };
    }
  }

  // Monthly/Yearly dueDay should be 1-31 (day of month)
  if ((frequency === "monthly" || frequency === "yearly") &&
      dueDay !== null && dueDay !== undefined) {
    if (dueDay < 1 || dueDay > 31) {
      return { valid: false, error: "Para mensal/anual, dia deve ser 1 a 31" };
    }
  }

  return { valid: true };
}

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
