import withAuthRequired from "@/lib/auth/withAuthRequired";
import { db } from "@/db";
import { financialAccounts, budgetMembers } from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { accountTypeEnum } from "@/db/schema/accounts";
import { capitalizeWords } from "@/lib/utils";

const updateAccountSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  type: accountTypeEnum.optional(),
  color: z.string().optional(),
  icon: z.string().optional(),
  balance: z.number().int().optional(),
  clearedBalance: z.number().int().optional(),
  ownerId: z.string().uuid().optional().nullable(),
  // Credit card fields
  creditLimit: z.number().int().optional(),
  closingDay: z.number().int().min(1).max(31).optional(),
  dueDay: z.number().int().min(1).max(31).optional(),
  isArchived: z.boolean().optional(),
});

// Helper to get user's budget IDs
async function getUserBudgetIds(userId: string) {
  const memberships = await db
    .select({ budgetId: budgetMembers.budgetId })
    .from(budgetMembers)
    .where(eq(budgetMembers.userId, userId));
  return memberships.map((m) => m.budgetId);
}

// GET - Get a specific account
export const GET = withAuthRequired(async (req, context) => {
  const { session } = context;
  const params = await context.params;
  const accountId = params.id as string;

  const budgetIds = await getUserBudgetIds(session.user.id);
  if (budgetIds.length === 0) {
    return NextResponse.json({ error: "Account not found" }, { status: 404 });
  }

  const [account] = await db
    .select()
    .from(financialAccounts)
    .where(
      and(
        eq(financialAccounts.id, accountId),
        inArray(financialAccounts.budgetId, budgetIds)
      )
    );

  if (!account) {
    return NextResponse.json({ error: "Account not found" }, { status: 404 });
  }

  return NextResponse.json({ account });
});

// PATCH - Update an account
export const PATCH = withAuthRequired(async (req, context) => {
  const { session } = context;
  const params = await context.params;
  const accountId = params.id as string;
  const body = await req.json();

  const budgetIds = await getUserBudgetIds(session.user.id);
  if (budgetIds.length === 0) {
    return NextResponse.json({ error: "Account not found" }, { status: 404 });
  }

  // Check account exists and user has access
  const [existingAccount] = await db
    .select()
    .from(financialAccounts)
    .where(
      and(
        eq(financialAccounts.id, accountId),
        inArray(financialAccounts.budgetId, budgetIds)
      )
    );

  if (!existingAccount) {
    return NextResponse.json({ error: "Account not found" }, { status: 404 });
  }

  const validation = updateAccountSchema.safeParse(body);
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

  const [updatedAccount] = await db
    .update(financialAccounts)
    .set(updateData)
    .where(eq(financialAccounts.id, accountId))
    .returning();

  return NextResponse.json({ account: updatedAccount });
});

// DELETE - Delete an account
export const DELETE = withAuthRequired(async (req, context) => {
  const { session } = context;
  const params = await context.params;
  const accountId = params.id as string;

  const budgetIds = await getUserBudgetIds(session.user.id);
  if (budgetIds.length === 0) {
    return NextResponse.json({ error: "Account not found" }, { status: 404 });
  }

  // Check account exists and user has access
  const [existingAccount] = await db
    .select()
    .from(financialAccounts)
    .where(
      and(
        eq(financialAccounts.id, accountId),
        inArray(financialAccounts.budgetId, budgetIds)
      )
    );

  if (!existingAccount) {
    return NextResponse.json({ error: "Account not found" }, { status: 404 });
  }

  await db.delete(financialAccounts).where(eq(financialAccounts.id, accountId));

  return NextResponse.json({ success: true });
});
