import withAuthRequired from "@/lib/auth/withAuthRequired";
import { db } from "@/db";
import { financialAccounts, budgetMembers } from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { accountTypeEnum } from "@/db/schema/accounts";

const createAccountSchema = z.object({
  budgetId: z.string().uuid(),
  name: z.string().min(1).max(100),
  type: accountTypeEnum,
  color: z.string().optional(),
  icon: z.string().optional(),
  balance: z.number().int().default(0),
  // Credit card fields
  creditLimit: z.number().int().optional(),
  closingDay: z.number().int().min(1).max(31).optional(),
  dueDay: z.number().int().min(1).max(31).optional(),
});

// Helper to get user's budget IDs
async function getUserBudgetIds(userId: string) {
  const memberships = await db
    .select({ budgetId: budgetMembers.budgetId })
    .from(budgetMembers)
    .where(eq(budgetMembers.userId, userId));
  return memberships.map((m) => m.budgetId);
}

// GET - Get accounts for user's budgets
export const GET = withAuthRequired(async (req, context) => {
  const { session } = context;
  const { searchParams } = new URL(req.url);
  const budgetId = searchParams.get("budgetId");

  const budgetIds = await getUserBudgetIds(session.user.id);

  if (budgetIds.length === 0) {
    return NextResponse.json({ accounts: [] });
  }

  let query = db
    .select()
    .from(financialAccounts)
    .where(
      budgetId
        ? and(eq(financialAccounts.budgetId, budgetId), inArray(financialAccounts.budgetId, budgetIds))
        : inArray(financialAccounts.budgetId, budgetIds)
    );

  const userAccounts = await query;

  return NextResponse.json({ accounts: userAccounts });
});

// POST - Create a new account
export const POST = withAuthRequired(async (req, context) => {
  const { session } = context;
  const body = await req.json();

  const validation = createAccountSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(
      { error: "Validation failed", details: validation.error.errors },
      { status: 400 }
    );
  }

  const { budgetId, ...accountData } = validation.data;

  // Check user has access to budget
  const budgetIds = await getUserBudgetIds(session.user.id);
  if (!budgetIds.includes(budgetId)) {
    return NextResponse.json(
      { error: "Budget not found or access denied" },
      { status: 404 }
    );
  }

  // Get display order
  const existingAccounts = await db
    .select()
    .from(financialAccounts)
    .where(eq(financialAccounts.budgetId, budgetId));

  const [newAccount] = await db
    .insert(financialAccounts)
    .values({
      ...accountData,
      budgetId,
      displayOrder: existingAccounts.length,
    })
    .returning();

  return NextResponse.json({ account: newAccount }, { status: 201 });
});
