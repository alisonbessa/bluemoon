import withAuthRequired from "@/shared/lib/auth/withAuthRequired";
import { db } from "@/db";
import { incomeSources, budgetMembers, financialAccounts } from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { capitalizeWords } from "@/shared/lib/utils";
import { getUserBudgetIds } from "@/shared/lib/api/permissions";
import {
  validationError,
  forbiddenError,
  successResponse,
} from "@/shared/lib/api/responses";
import { createIncomeSourceSchema } from "@/shared/lib/validations/income.schema";

// GET - Get income sources for user's budgets
export const GET = withAuthRequired(async (req, context) => {
  const { session } = context;
  const { searchParams } = new URL(req.url);
  const budgetId = searchParams.get("budgetId");

  const budgetIds = await getUserBudgetIds(session.user.id);
  if (budgetIds.length === 0) {
    return successResponse({ incomeSources: [] });
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
    member: s.member ? { id: s.member.id, name: s.member.name, color: s.member.color } : null,
    account: s.account ? { id: s.account.id, name: s.account.name, icon: s.account.icon } : null,
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

  return successResponse({
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
    return validationError(validation.error);
  }

  const { budgetId, ...incomeData } = validation.data;

  // Check user has access to budget
  const budgetIds = await getUserBudgetIds(session.user.id);
  if (!budgetIds.includes(budgetId)) {
    return forbiddenError("Budget not found or access denied");
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

  return successResponse({ incomeSource: newSource }, 201);
});
