import { db } from "@/db";
import {
  incomeSources,
  transactions,
  financialAccounts,
  recurringBills,
} from "@/db/schema";
import { eq, and, gte, lte, isNotNull } from "drizzle-orm";

interface EnsureResult {
  created: number;
  expenses: number;
  income: number;
  alreadyExisted: boolean;
}

/**
 * Ensure pending transactions exist for a given month.
 * This implements "lazy generation" - transactions are created on-demand
 * when queried, rather than requiring a manual "start month" action.
 *
 * @param budgetId - The budget ID
 * @param year - The year (e.g., 2026)
 * @param month - The month (1-12)
 * @returns Information about what was created
 */
export async function ensurePendingTransactionsForMonth(
  budgetId: string,
  year: number,
  month: number
): Promise<EnsureResult> {
  // Calculate date range for this month
  const startDate = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0));
  const lastDayOfMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const endDate = new Date(Date.UTC(year, month - 1, lastDayOfMonth, 23, 59, 59));

  // Check existing transactions for this month
  const existingTransactions = await db
    .select({
      recurringBillId: transactions.recurringBillId,
      incomeSourceId: transactions.incomeSourceId,
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

  // Get default account for income transactions without specific account
  const defaultAccount = await db
    .select()
    .from(financialAccounts)
    .where(eq(financialAccounts.budgetId, budgetId))
    .limit(1);

  if (defaultAccount.length === 0) {
    return { created: 0, expenses: 0, income: 0, alreadyExisted: true };
  }

  // Create pending expense transactions from recurring bills
  const expenseTransactions = [];
  for (const bill of activeBills) {
    // Skip if already has transaction this month
    if (existingBillIds.has(bill.id)) continue;

    // Check frequency
    if (bill.frequency === "yearly" && bill.dueMonth !== month) continue;
    // Weekly bills: simplified for now, just generate one per month
    // TODO: implement weekly logic properly

    if (bill.amount <= 0) continue;

    const dueDay = bill.dueDay ? Math.min(bill.dueDay, lastDayOfMonth) : 1;
    const dueDate = new Date(Date.UTC(year, month - 1, dueDay, 12, 0, 0)); // Noon UTC to avoid timezone issues

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

  // Create pending income transactions (only for sources not yet in this month)
  const incomeTransactions = [];
  for (const { incomeSource, account } of incomeSourcesWithDay) {
    if (existingIncomeIds.has(incomeSource.id)) continue;

    if (incomeSource.amount <= 0) continue;

    const dueDay = Math.min(incomeSource.dayOfMonth!, lastDayOfMonth);
    const dueDate = new Date(Date.UTC(year, month - 1, dueDay, 12, 0, 0)); // Noon UTC to avoid timezone issues

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

  // Insert all new transactions
  const allTransactions = [...expenseTransactions, ...incomeTransactions];

  if (allTransactions.length > 0) {
    await db.insert(transactions).values(allTransactions);
  }

  return {
    created: allTransactions.length,
    expenses: expenseTransactions.length,
    income: incomeTransactions.length,
    alreadyExisted: allTransactions.length === 0,
  };
}

/**
 * Get or create pending transactions for the current month.
 * This is a convenience wrapper around ensurePendingTransactionsForMonth.
 */
export async function ensureCurrentMonthTransactions(budgetId: string): Promise<EnsureResult> {
  const now = new Date();
  return ensurePendingTransactionsForMonth(
    budgetId,
    now.getFullYear(),
    now.getMonth() + 1
  );
}
