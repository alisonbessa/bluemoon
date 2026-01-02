import withAuthRequired from "@/lib/auth/withAuthRequired";
import { db } from "@/db";
import { goals, goalContributions, budgetMembers } from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { capitalizeWords } from "@/lib/utils";

const createGoalSchema = z.object({
  budgetId: z.string().uuid(),
  accountId: z.string().uuid(), // Conta onde a meta será guardada (obrigatória)
  name: z.string().min(1).max(100),
  icon: z.string().max(10).optional(),
  color: z.string().max(10).optional(),
  targetAmount: z.number().int().min(1),
  initialAmount: z.number().int().min(0).optional(),
  targetDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
});

// Helper to get user's budget IDs
async function getUserBudgetIds(userId: string) {
  const memberships = await db
    .select({ budgetId: budgetMembers.budgetId })
    .from(budgetMembers)
    .where(eq(budgetMembers.userId, userId));
  return memberships.map((m) => m.budgetId);
}

// Helper to calculate goal metrics
function calculateGoalMetrics(goal: typeof goals.$inferSelect) {
  const now = new Date();
  const targetDate = new Date(goal.targetDate);
  const currentAmount = goal.currentAmount ?? 0;
  const targetAmount = goal.targetAmount;

  // Calculate progress percentage
  const progress = Math.min(Math.round((currentAmount / targetAmount) * 100), 100);

  // Calculate months remaining
  const monthsRemaining = Math.max(
    0,
    (targetDate.getFullYear() - now.getFullYear()) * 12 +
      (targetDate.getMonth() - now.getMonth())
  );

  // Calculate monthly target
  const remaining = targetAmount - currentAmount;
  const monthlyTarget = monthsRemaining > 0 ? Math.ceil(remaining / monthsRemaining) : remaining;

  return {
    progress,
    monthsRemaining,
    monthlyTarget,
    remaining,
  };
}

// GET - Get goals for user's budgets
export const GET = withAuthRequired(async (req, context) => {
  const { session } = context;
  const { searchParams } = new URL(req.url);
  const budgetId = searchParams.get("budgetId");
  const includeArchived = searchParams.get("includeArchived") === "true";

  const budgetIds = await getUserBudgetIds(session.user.id);
  if (budgetIds.length === 0) {
    return NextResponse.json({ goals: [] });
  }

  const conditions = [inArray(goals.budgetId, budgetIds)];

  if (budgetId) {
    conditions.push(eq(goals.budgetId, budgetId));
  }

  if (!includeArchived) {
    conditions.push(eq(goals.isArchived, false));
  }

  const userGoals = await db
    .select()
    .from(goals)
    .where(and(...conditions))
    .orderBy(goals.displayOrder);

  // Add calculated metrics to each goal
  const goalsWithMetrics = userGoals.map((goal) => ({
    ...goal,
    ...calculateGoalMetrics(goal),
  }));

  return NextResponse.json({ goals: goalsWithMetrics });
});

// POST - Create a new goal
export const POST = withAuthRequired(async (req, context) => {
  const { session } = context;
  const body = await req.json();

  const validation = createGoalSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(
      { error: "Validation failed", details: validation.error.errors },
      { status: 400 }
    );
  }

  const { budgetId, targetDate, initialAmount, accountId, ...goalData } = validation.data;

  // Check user has access to budget
  const budgetIds = await getUserBudgetIds(session.user.id);
  if (!budgetIds.includes(budgetId)) {
    return NextResponse.json(
      { error: "Budget not found or access denied" },
      { status: 404 }
    );
  }

  // Get display order
  const existingGoals = await db
    .select()
    .from(goals)
    .where(eq(goals.budgetId, budgetId));

  const [newGoal] = await db
    .insert(goals)
    .values({
      ...goalData,
      name: capitalizeWords(goalData.name),
      budgetId,
      accountId,
      targetDate: new Date(targetDate),
      currentAmount: initialAmount || 0,
      displayOrder: existingGoals.length,
    })
    .returning();

  return NextResponse.json(
    {
      goal: {
        ...newGoal,
        ...calculateGoalMetrics(newGoal),
      },
    },
    { status: 201 }
  );
});
