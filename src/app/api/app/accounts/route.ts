import withAuthRequired from "@/lib/auth/withAuthRequired";
import { db } from "@/db";
import { financialAccounts, budgetMembers } from "@/db/schema";
import { eq, and, inArray, or, isNull } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { accountTypeEnum } from "@/db/schema/accounts";
import { capitalizeWords } from "@/lib/utils";

const createAccountSchema = z.object({
  budgetId: z.string().uuid(),
  name: z.string().min(1).max(100),
  type: accountTypeEnum,
  color: z.string().optional(),
  icon: z.string().optional(),
  balance: z.number().int().default(0),
  ownerId: z.string().uuid().optional().nullable(),
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

// Helper to get user's member ID in a specific budget
async function getUserMemberIdInBudget(userId: string, budgetId: string) {
  const membership = await db
    .select({ memberId: budgetMembers.id })
    .from(budgetMembers)
    .where(and(eq(budgetMembers.userId, userId), eq(budgetMembers.budgetId, budgetId)))
    .limit(1);
  return membership[0]?.memberId || null;
}

// GET - Get accounts for user's budgets
// Only returns accounts owned by the user OR shared accounts (ownerId is null)
export const GET = withAuthRequired(async (req, context) => {
  const { session } = context;
  const { searchParams } = new URL(req.url);
  const budgetId = searchParams.get("budgetId");

  const budgetIds = await getUserBudgetIds(session.user.id);

  if (budgetIds.length === 0) {
    return NextResponse.json({ accounts: [] });
  }

  // Get user's member ID for visibility filtering
  const activeBudgetId = budgetId || budgetIds[0];
  const userMemberId = await getUserMemberIdInBudget(session.user.id, activeBudgetId);

  // Base condition: account belongs to user's budgets
  const budgetCondition = budgetId
    ? and(eq(financialAccounts.budgetId, budgetId), inArray(financialAccounts.budgetId, budgetIds))
    : inArray(financialAccounts.budgetId, budgetIds);

  // Visibility condition: owned by user OR shared (ownerId is null)
  const visibilityCondition = userMemberId
    ? or(eq(financialAccounts.ownerId, userMemberId), isNull(financialAccounts.ownerId))
    : isNull(financialAccounts.ownerId);

  const whereCondition = and(budgetCondition, visibilityCondition);

  const userAccounts = await db
    .select({
      id: financialAccounts.id,
      budgetId: financialAccounts.budgetId,
      ownerId: financialAccounts.ownerId,
      name: financialAccounts.name,
      type: financialAccounts.type,
      color: financialAccounts.color,
      icon: financialAccounts.icon,
      balance: financialAccounts.balance,
      clearedBalance: financialAccounts.clearedBalance,
      creditLimit: financialAccounts.creditLimit,
      closingDay: financialAccounts.closingDay,
      dueDay: financialAccounts.dueDay,
      isArchived: financialAccounts.isArchived,
      displayOrder: financialAccounts.displayOrder,
      createdAt: financialAccounts.createdAt,
      updatedAt: financialAccounts.updatedAt,
      owner: {
        id: budgetMembers.id,
        name: budgetMembers.name,
        type: budgetMembers.type,
        color: budgetMembers.color,
      },
    })
    .from(financialAccounts)
    .leftJoin(budgetMembers, eq(financialAccounts.ownerId, budgetMembers.id))
    .where(whereCondition);

  return NextResponse.json(
    { accounts: userAccounts },
    {
      // PERFORMANCE: Cache for 30 seconds, stale-while-revalidate for 5 minutes
      headers: {
        "Cache-Control": "private, max-age=30, stale-while-revalidate=300",
      },
    }
  );
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
      name: capitalizeWords(accountData.name),
      budgetId,
      displayOrder: existingAccounts.length,
    })
    .returning();

  return NextResponse.json({ account: newAccount }, { status: 201 });
});
