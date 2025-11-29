import withAuthRequired from "@/lib/auth/withAuthRequired";
import { db } from "@/db";
import { incomeSources, budgetMembers } from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { incomeTypeEnum, incomeFrequencyEnum } from "@/db/schema/income-sources";
import { capitalizeWords } from "@/lib/utils";

const updateIncomeSourceSchema = z.object({
  memberId: z.string().uuid().optional().nullable(),
  accountId: z.string().uuid().optional().nullable(),
  name: z.string().min(1).max(100).optional(),
  type: incomeTypeEnum.optional(),
  amount: z.number().int().min(0).optional(),
  frequency: incomeFrequencyEnum.optional(),
  dayOfMonth: z.number().int().min(1).max(31).optional().nullable(),
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

// GET - Get a specific income source
export const GET = withAuthRequired(async (req, context) => {
  const { session } = context;
  const params = await context.params;
  const sourceId = params.id as string;

  const budgetIds = await getUserBudgetIds(session.user.id);
  if (budgetIds.length === 0) {
    return NextResponse.json({ error: "Income source not found" }, { status: 404 });
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
    return NextResponse.json({ error: "Income source not found" }, { status: 404 });
  }

  return NextResponse.json({ incomeSource: source });
});

// PATCH - Update an income source
export const PATCH = withAuthRequired(async (req, context) => {
  const { session } = context;
  const params = await context.params;
  const sourceId = params.id as string;
  const body = await req.json();

  const budgetIds = await getUserBudgetIds(session.user.id);
  if (budgetIds.length === 0) {
    return NextResponse.json({ error: "Income source not found" }, { status: 404 });
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
    return NextResponse.json({ error: "Income source not found" }, { status: 404 });
  }

  const validation = updateIncomeSourceSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(
      { error: "Validation failed", details: validation.error.errors },
      { status: 400 }
    );
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

  return NextResponse.json({ incomeSource: updatedSource });
});

// DELETE - Delete an income source (soft delete by deactivating)
export const DELETE = withAuthRequired(async (req, context) => {
  const { session } = context;
  const params = await context.params;
  const sourceId = params.id as string;

  const budgetIds = await getUserBudgetIds(session.user.id);
  if (budgetIds.length === 0) {
    return NextResponse.json({ error: "Income source not found" }, { status: 404 });
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
    return NextResponse.json({ error: "Income source not found" }, { status: 404 });
  }

  // Soft delete by deactivating
  await db
    .update(incomeSources)
    .set({
      isActive: false,
      updatedAt: new Date(),
    })
    .where(eq(incomeSources.id, sourceId));

  return NextResponse.json({ success: true });
});
