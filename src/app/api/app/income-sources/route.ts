import withAuthRequired from "@/shared/lib/auth/withAuthRequired";
import { db } from "@/db";
import { incomeSources, budgetMembers, financialAccounts } from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { incomeTypeEnum, incomeFrequencyEnum } from "@/db/schema/income-sources";
import { capitalizeWords } from "@/shared/lib/utils";

const createIncomeSourceSchema = z.object({
  budgetId: z.string().uuid(),
  memberId: z.string().uuid().optional(),
  accountId: z.string().uuid().optional(),
  name: z.string().min(1).max(100),
  type: incomeTypeEnum.default("salary"),
  amount: z.number().int().min(0),
  frequency: incomeFrequencyEnum.default("monthly"),
  dayOfMonth: z.number().int().min(1).max(31).optional(),
  isAutoConfirm: z.boolean().optional().default(false),
});

// Helper to get user's budget IDs
async function getUserBudgetIds(userId: string) {
  const memberships = await db
    .select({ budgetId: budgetMembers.budgetId })
    .from(budgetMembers)
    .where(eq(budgetMembers.userId, userId));
  return memberships.map((m) => m.budgetId);
}

// GET - Get income sources for user's budgets
export const GET = withAuthRequired(async (req, context) => {
  const { session } = context;
  const { searchParams } = new URL(req.url);
  const budgetId = searchParams.get("budgetId");

  const budgetIds = await getUserBudgetIds(session.user.id);
  if (budgetIds.length === 0) {
    return NextResponse.json({ incomeSources: [] });
  }

  const sources = await db
    .select({
      incomeSource: incomeSources,
      member: budgetMembers,
      account: financialAccounts,
    })
    .from(incomeSources)
    .leftJoin(budgetMembers, eq(incomeSources.memberId, budgetMembers.id))
    .leftJoin(financialAccounts, eq(incomeSources.accountId, financialAccounts.id))
    .where(
      budgetId
        ? and(
            eq(incomeSources.budgetId, budgetId),
            inArray(incomeSources.budgetId, budgetIds),
            eq(incomeSources.isActive, true)
          )
        : and(
            inArray(incomeSources.budgetId, budgetIds),
            eq(incomeSources.isActive, true)
          )
    )
    .orderBy(incomeSources.displayOrder);

  const formattedSources = sources.map((s) => ({
    ...s.incomeSource,
    member: s.member ? { id: s.member.id, name: s.member.name } : null,
    account: s.account ? { id: s.account.id, name: s.account.name } : null,
  }));

  // Calculate total monthly income
  const totalMonthlyIncome = formattedSources.reduce((acc, source) => {
    let monthlyAmount = source.amount;
    if (source.frequency === "biweekly") {
      monthlyAmount = source.amount * 2;
    } else if (source.frequency === "weekly") {
      monthlyAmount = source.amount * 4;
    }
    return acc + monthlyAmount;
  }, 0);

  return NextResponse.json({
    incomeSources: formattedSources,
    totalMonthlyIncome,
  });
});

// POST - Create a new income source
export const POST = withAuthRequired(async (req, context) => {
  const { session } = context;
  const body = await req.json();

  const validation = createIncomeSourceSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(
      { error: "Validation failed", details: validation.error.errors },
      { status: 400 }
    );
  }

  const { budgetId, ...incomeData } = validation.data;

  // Check user has access to budget
  const budgetIds = await getUserBudgetIds(session.user.id);
  if (!budgetIds.includes(budgetId)) {
    return NextResponse.json(
      { error: "Budget not found or access denied" },
      { status: 404 }
    );
  }

  // Get display order
  const existingSources = await db
    .select()
    .from(incomeSources)
    .where(eq(incomeSources.budgetId, budgetId));

  const [newSource] = await db
    .insert(incomeSources)
    .values({
      ...incomeData,
      name: capitalizeWords(incomeData.name),
      budgetId,
      displayOrder: existingSources.length,
    })
    .returning();

  return NextResponse.json({ incomeSource: newSource }, { status: 201 });
});
