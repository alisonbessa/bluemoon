import withAuthRequired from "@/shared/lib/auth/withAuthRequired";
import { requireActiveSubscription } from "@/shared/lib/auth/withSubscriptionRequired";
import { db } from "@/db";
import { recurringBills, categories, financialAccounts } from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { getUserBudgetIds } from "@/shared/lib/api/permissions";
import {
  validationError,
  notFoundError,
  successResponse,
  errorResponse,
} from "@/shared/lib/api/responses";
import { updateRecurringBillSchema, validateFrequencyFields } from "@/shared/lib/validations";
import { recordAuditLog } from "@/shared/lib/security/audit-log";

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

  const subscriptionError = await requireActiveSubscription(session.user.id);
  if (subscriptionError) return subscriptionError;

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

  // If the user is moving the bill to a different category or account, those
  // FKs must still belong to the same budget — otherwise we'd cross budgets.
  if (validation.data.categoryId && validation.data.categoryId !== existingBill.categoryId) {
    const [cat] = await db
      .select({ id: categories.id })
      .from(categories)
      .where(
        and(
          eq(categories.id, validation.data.categoryId),
          eq(categories.budgetId, existingBill.budgetId)
        )
      );
    if (!cat) {
      return errorResponse("Category does not belong to this budget", 400);
    }
  }
  if (validation.data.accountId && validation.data.accountId !== existingBill.accountId) {
    const [acc] = await db
      .select({ id: financialAccounts.id })
      .from(financialAccounts)
      .where(
        and(
          eq(financialAccounts.id, validation.data.accountId),
          eq(financialAccounts.budgetId, existingBill.budgetId)
        )
      );
    if (!acc) {
      return errorResponse("Account does not belong to this budget", 400);
    }
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

  await recordAuditLog({
    userId: session.user.id,
    action: "recurring_bill.update",
    resource: "recurring_bill",
    resourceId: billId,
    details: { budgetId: updatedBill.budgetId },
    req,
  });

  return successResponse({ recurringBill: updatedBill });
});

// DELETE - Delete a recurring bill (soft delete by deactivating)
export const DELETE = withAuthRequired(async (req, context) => {
  const { session } = context;

  const subscriptionError = await requireActiveSubscription(session.user.id);
  if (subscriptionError) return subscriptionError;

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

  await recordAuditLog({
    userId: session.user.id,
    action: "recurring_bill.delete",
    resource: "recurring_bill",
    resourceId: billId,
    details: { budgetId: existingBill.budgetId },
    req,
  });

  return successResponse({ success: true });
});
