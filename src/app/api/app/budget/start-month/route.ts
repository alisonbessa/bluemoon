import withAuthRequired from "@/shared/lib/auth/withAuthRequired";
import { db } from "@/db";
import {
  budgetMembers,
  incomeSources,
  transactions,
  monthlyBudgetStatus,
  financialAccounts,
  recurringBills,
} from "@/db/schema";
import { eq, and, gte, lte, isNotNull } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

// Helper to get user's budget IDs
async function getUserBudgetIds(userId: string) {
  const memberships = await db
    .select({ budgetId: budgetMembers.budgetId })
    .from(budgetMembers)
    .where(eq(budgetMembers.userId, userId));
  return memberships.map((m) => m.budgetId);
}

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
    return NextResponse.json(
      { error: "Dados inválidos", details: validation.error.errors },
      { status: 400 }
    );
  }

  const { budgetId, year, month } = validation.data;

  // Verify user has access to this budget
  const budgetIds = await getUserBudgetIds(session.user.id);
  if (!budgetIds.includes(budgetId)) {
    return NextResponse.json(
      { error: "Orçamento não encontrado ou sem acesso" },
      { status: 404 }
    );
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
    return NextResponse.json(
      { error: "Este mês já foi iniciado" },
      { status: 400 }
    );
  }

  // Calculate date range for this month
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59);

  // Get all active recurring bills
  const activeBills = await db
    .select()
    .from(recurringBills)
    .where(
      and(
        eq(recurringBills.budgetId, budgetId),
        eq(recurringBills.isActive, true)
      )
    );

  // Get income sources with dayOfMonth
  const incomeSourcesWithDay = await db
    .select({
      incomeSource: incomeSources,
      account: financialAccounts,
    })
    .from(incomeSources)
    .leftJoin(financialAccounts, eq(incomeSources.accountId, financialAccounts.id))
    .where(
      and(
        eq(incomeSources.budgetId, budgetId),
        eq(incomeSources.isActive, true),
        isNotNull(incomeSources.dayOfMonth)
      )
    );

  // Get default account for transactions without specific account
  const defaultAccount = await db
    .select()
    .from(financialAccounts)
    .where(eq(financialAccounts.budgetId, budgetId))
    .limit(1);

  if (defaultAccount.length === 0) {
    return NextResponse.json(
      { error: "Nenhuma conta encontrada. Crie uma conta primeiro." },
      { status: 400 }
    );
  }

  // Check existing transactions to avoid duplicates
  const existingTransactions = await db
    .select({
      categoryId: transactions.categoryId,
      incomeSourceId: transactions.incomeSourceId,
      recurringBillId: transactions.recurringBillId,
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.budgetId, budgetId),
        gte(transactions.date, startDate),
        lte(transactions.date, endDate)
      )
    );

  const existingBillIds = new Set(
    existingTransactions.filter((t) => t.recurringBillId).map((t) => t.recurringBillId)
  );
  const existingIncomeIds = new Set(
    existingTransactions.filter((t) => t.incomeSourceId).map((t) => t.incomeSourceId)
  );

  // Create pending expense transactions from recurring bills
  const expenseTransactions = [];
  for (const bill of activeBills) {
    // Skip if already has transaction this month
    if (existingBillIds.has(bill.id)) continue;

    // Check frequency
    if (bill.frequency === "yearly" && bill.dueMonth !== month) continue;
    // Weekly bills: generate 4-5 transactions (one per week) - simplified for now, just generate one
    // TODO: implement weekly logic properly

    if (bill.amount <= 0) continue;

    const dueDay = bill.dueDay ? Math.min(bill.dueDay, endDate.getDate()) : 1;
    const dueDate = new Date(year, month - 1, dueDay);

    expenseTransactions.push({
      budgetId,
      accountId: bill.accountId,
      categoryId: bill.categoryId,
      recurringBillId: bill.id,
      type: "expense" as const,
      status: "pending" as const,
      amount: bill.amount,
      description: bill.name,
      date: dueDate,
      source: "recurring",
    });
  }

  // Create pending income transactions
  const incomeTransactions = [];
  for (const { incomeSource, account } of incomeSourcesWithDay) {
    if (existingIncomeIds.has(incomeSource.id)) continue;

    if (incomeSource.amount <= 0) continue;

    const dueDay = Math.min(incomeSource.dayOfMonth!, endDate.getDate());
    const dueDate = new Date(year, month - 1, dueDay);

    incomeTransactions.push({
      budgetId,
      accountId: account?.id || defaultAccount[0].id,
      incomeSourceId: incomeSource.id,
      type: "income" as const,
      status: "pending" as const,
      amount: incomeSource.amount,
      description: `${incomeSource.name} (agendado)`,
      date: dueDate,
      source: "scheduled",
    });
  }

  // Insert all transactions
  const allTransactions = [...expenseTransactions, ...incomeTransactions];
  let createdCount = 0;

  if (allTransactions.length > 0) {
    await db.insert(transactions).values(allTransactions);
    createdCount = allTransactions.length;
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

  return NextResponse.json({
    success: true,
    message: `Mês iniciado com sucesso!`,
    createdTransactions: createdCount,
    expenses: expenseTransactions.length,
    income: incomeTransactions.length,
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
    return NextResponse.json({ error: "budgetId is required" }, { status: 400 });
  }

  const budgetIds = await getUserBudgetIds(session.user.id);
  if (!budgetIds.includes(budgetId)) {
    return NextResponse.json({ error: "Budget not found" }, { status: 404 });
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

  return NextResponse.json({
    year,
    month,
    status: status.length > 0 ? status[0].status : "planning",
    startedAt: status.length > 0 ? status[0].startedAt : null,
  });
});
