import withAuthRequired from "@/shared/lib/auth/withAuthRequired";
import { db } from "@/db";
import { monthlyBudgetStatus } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { getUserBudgetIds } from "@/shared/lib/api/permissions";
import { ensurePendingTransactionsForMonth } from "@/shared/lib/budget/pending-transactions";
import {
  validationError,
  forbiddenError,
  successResponse,
  errorResponse,
} from "@/shared/lib/api/responses";

const startMonthSchema = z.object({
  budgetId: z.string(),
  year: z.number().min(2020).max(2100),
  month: z.number().min(1).max(12),
});

// POST - Start a month (create pending transactions)
export const POST = withAuthRequired(async (req, context) => {
  const { session } = context;
  const body = await req.json();

  const validation = startMonthSchema.safeParse(body);
  if (!validation.success) {
    return validationError(validation.error);
  }

  const { budgetId, year, month } = validation.data;

  // Verify user has access to this budget
  const budgetIds = await getUserBudgetIds(session.user.id);
  if (!budgetIds.includes(budgetId)) {
    return forbiddenError("Orçamento não encontrado ou sem acesso");
  }

  // Check current month status
  const existingStatus = await db
    .select()
    .from(monthlyBudgetStatus)
    .where(
      and(
        eq(monthlyBudgetStatus.budgetId, budgetId),
        eq(monthlyBudgetStatus.year, year),
        eq(monthlyBudgetStatus.month, month)
      )
    )
    .limit(1);

  if (existingStatus.length > 0 && existingStatus[0].status === "active") {
    return errorResponse("Este mês já foi iniciado", 400);
  }

  // Use centralized function that handles all frequencies (weekly, biweekly, monthly, yearly)
  const result = await ensurePendingTransactionsForMonth(budgetId, year, month);

  if (result.noAccount) {
    return errorResponse("Nenhuma conta encontrada. Crie uma conta primeiro.", 400);
  }

  // Update or create month status
  if (existingStatus.length > 0) {
    await db
      .update(monthlyBudgetStatus)
      .set({
        status: "active",
        startedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(monthlyBudgetStatus.id, existingStatus[0].id));
  } else {
    await db.insert(monthlyBudgetStatus).values({
      budgetId,
      year,
      month,
      status: "active",
      startedAt: new Date(),
    });
  }

  return successResponse({
    message: `Mês iniciado com sucesso!`,
    createdTransactions: result.created,
    expenses: result.expenses,
    income: result.income,
  });
});

// GET - Get month status
export const GET = withAuthRequired(async (req, context) => {
  const { session } = context;
  const { searchParams } = new URL(req.url);
  const budgetId = searchParams.get("budgetId");
  const year = parseInt(searchParams.get("year") || new Date().getFullYear().toString());
  const month = parseInt(searchParams.get("month") || (new Date().getMonth() + 1).toString());

  if (!budgetId) {
    return errorResponse("budgetId is required", 400);
  }

  const budgetIds = await getUserBudgetIds(session.user.id);
  if (!budgetIds.includes(budgetId)) {
    return forbiddenError("Budget not found");
  }

  const status = await db
    .select()
    .from(monthlyBudgetStatus)
    .where(
      and(
        eq(monthlyBudgetStatus.budgetId, budgetId),
        eq(monthlyBudgetStatus.year, year),
        eq(monthlyBudgetStatus.month, month)
      )
    )
    .limit(1);

  return successResponse({
    year,
    month,
    status: status.length > 0 ? status[0].status : "planning",
    startedAt: status.length > 0 ? status[0].startedAt : null,
  });
});
