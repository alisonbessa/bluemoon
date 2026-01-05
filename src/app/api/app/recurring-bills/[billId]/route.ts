import withAuthRequired from "@/lib/auth/withAuthRequired";
import { db } from "@/db";
import { recurringBills, budgetMembers } from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { recurringBillFrequencyEnum } from "@/db/schema/recurring-bills";

const updateRecurringBillSchema = z.object({
  categoryId: z.string().uuid().optional(),
  accountId: z.string().uuid().optional(), // pode mudar a conta, mas é obrigatório ter uma
  name: z.string().min(1).max(100).optional(),
  amount: z.number().int().min(0).optional(),
  frequency: recurringBillFrequencyEnum.optional(),
  dueDay: z.number().int().min(1).max(31).optional().nullable(),
  dueMonth: z.number().int().min(1).max(12).optional().nullable(),
  isAutoDebit: z.boolean().optional(),
  isVariable: z.boolean().optional(),
  isActive: z.boolean().optional(),
  displayOrder: z.number().int().optional(),
});

// Helper to get user's budget IDs
async function getUserBudgetIds(userId: string) {
  const memberships = await db
    .select({ budgetId: budgetMembers.budgetId })
    .from(budgetMembers)
    .where(eq(budgetMembers.userId, userId));
  return memberships.map((m) => m.budgetId);
}

// GET - Get a specific recurring bill
export const GET = withAuthRequired(async (req, context) => {
  const { session } = context;
  const params = await context.params;
  const billId = params.billId as string;

  const budgetIds = await getUserBudgetIds(session.user.id);
  if (budgetIds.length === 0) {
    return NextResponse.json({ error: "Recurring bill not found" }, { status: 404 });
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
    return NextResponse.json({ error: "Recurring bill not found" }, { status: 404 });
  }

  return NextResponse.json({ recurringBill: bill });
});

// PATCH - Update a recurring bill
export const PATCH = withAuthRequired(async (req, context) => {
  const { session } = context;
  const params = await context.params;
  const billId = params.billId as string;
  const body = await req.json();

  const budgetIds = await getUserBudgetIds(session.user.id);
  if (budgetIds.length === 0) {
    return NextResponse.json({ error: "Recurring bill not found" }, { status: 404 });
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
    return NextResponse.json({ error: "Recurring bill not found" }, { status: 404 });
  }

  const validation = updateRecurringBillSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(
      { error: "Validation failed", details: validation.error.errors },
      { status: 400 }
    );
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

  return NextResponse.json({ recurringBill: updatedBill });
});

// DELETE - Delete a recurring bill (soft delete by deactivating)
export const DELETE = withAuthRequired(async (req, context) => {
  const { session } = context;
  const params = await context.params;
  const billId = params.billId as string;

  const budgetIds = await getUserBudgetIds(session.user.id);
  if (budgetIds.length === 0) {
    return NextResponse.json({ error: "Recurring bill not found" }, { status: 404 });
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
    return NextResponse.json({ error: "Recurring bill not found" }, { status: 404 });
  }

  // Soft delete by deactivating
  await db
    .update(recurringBills)
    .set({
      isActive: false,
      updatedAt: new Date(),
    })
    .where(eq(recurringBills.id, billId));

  return NextResponse.json({ success: true });
});
