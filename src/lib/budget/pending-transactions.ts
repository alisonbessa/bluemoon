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
      date: transactions.date,
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.budgetId, budgetId),
        gte(transactions.date, startDate),
        lte(transactions.date, endDate)
      )
    );

  // For monthly/yearly: just track if bill has any transaction
  // For weekly: track specific dates to avoid duplicates
  const existingBillIds = new Set(
    existingTransactions.filter((t) => t.recurringBillId).map((t) => t.recurringBillId)
  );

  // Also track exact dates for weekly bills (to avoid duplicates)
  const existingBillDates = new Map<string, Set<string>>();
  existingTransactions.filter((t) => t.recurringBillId && t.date).forEach((t) => {
    const key = t.recurringBillId!;
    if (!existingBillDates.has(key)) {
      existingBillDates.set(key, new Set());
    }
    // Store date as ISO string (date only, no time)
    const dateStr = t.date.toISOString().split('T')[0];
    existingBillDates.get(key)!.add(dateStr);
  });
  const existingIncomeIds = new Set(
    existingTransactions.filter((t) => t.incomeSourceId).map((t) => t.incomeSourceId)
  );

  // Also track exact dates for income sources (for weekly/biweekly)
  const existingIncomeDates = new Map<string, Set<string>>();
  existingTransactions.filter((t) => t.incomeSourceId && t.date).forEach((t) => {
    const key = t.incomeSourceId!;
    if (!existingIncomeDates.has(key)) {
      existingIncomeDates.set(key, new Set());
    }
    const dateStr = t.date.toISOString().split('T')[0];
    existingIncomeDates.get(key)!.add(dateStr);
  });

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
    if (bill.amount <= 0) continue;

    // Handle different frequencies
    if (bill.frequency === "weekly") {
      // Weekly bills: generate for each occurrence in the month
      // dueDay for weekly = day of week (0=Sunday, 1=Monday, ..., 6=Saturday)
      const dayOfWeek = bill.dueDay ?? 1; // Default to Monday if not set
      const existingDates = existingBillDates.get(bill.id) || new Set();

      // Find all occurrences of this day of week in the month
      for (let day = 1; day <= lastDayOfMonth; day++) {
        const date = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
        if (date.getUTCDay() === dayOfWeek) {
          const dateStr = date.toISOString().split('T')[0];

          // Skip if transaction already exists for this date
          if (existingDates.has(dateStr)) continue;

          expenseTransactions.push({
            budgetId,
            accountId: bill.accountId,
            categoryId: bill.categoryId,
            recurringBillId: bill.id,
            type: "expense" as const,
            status: "pending" as const,
            amount: bill.amount,
            description: `${bill.name} (${date.getUTCDate()}/${month})`,
            date,
            source: "recurring",
          });
        }
      }
    } else if (bill.frequency === "yearly") {
      // Yearly bills: only generate in the specified month
      if (bill.dueMonth !== month) continue;

      // Skip if already has transaction this month
      if (existingBillIds.has(bill.id)) continue;

      const dueDay = bill.dueDay ? Math.min(bill.dueDay, lastDayOfMonth) : 1;
      const dueDate = new Date(Date.UTC(year, month - 1, dueDay, 12, 0, 0));

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
    } else {
      // Monthly bills (default)
      // Skip if already has transaction this month
      if (existingBillIds.has(bill.id)) continue;

      const dueDay = bill.dueDay ? Math.min(bill.dueDay, lastDayOfMonth) : 1;
      const dueDate = new Date(Date.UTC(year, month - 1, dueDay, 12, 0, 0));

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
  }

  // Create pending income transactions based on frequency
  const incomeTransactions = [];
  for (const { incomeSource, account } of incomeSourcesWithDay) {
    if (incomeSource.amount <= 0) continue;

    const frequency = incomeSource.frequency || "monthly";
    const existingDates = existingIncomeDates.get(incomeSource.id) || new Set();
    const accountId = account?.id || defaultAccount[0].id;

    if (frequency === "weekly") {
      // Weekly income: generate for each week of the month
      // dayOfMonth for weekly = day of week (0=Sunday, 6=Saturday)
      const dayOfWeek = incomeSource.dayOfMonth ?? 5; // Default to Friday

      for (let day = 1; day <= lastDayOfMonth; day++) {
        const date = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
        if (date.getUTCDay() === dayOfWeek) {
          const dateStr = date.toISOString().split('T')[0];

          if (existingDates.has(dateStr)) continue;

          incomeTransactions.push({
            budgetId,
            accountId,
            incomeSourceId: incomeSource.id,
            type: "income" as const,
            status: "pending" as const,
            amount: incomeSource.amount,
            description: `${incomeSource.name} (${date.getUTCDate()}/${month})`,
            date,
            source: "scheduled",
          });
        }
      }
    } else if (frequency === "biweekly") {
      // Biweekly income: generate 2 times per month (around day 1 and day 15)
      const baseDayOfMonth = incomeSource.dayOfMonth ?? 15;
      const days = [
        Math.min(baseDayOfMonth, lastDayOfMonth),
        Math.min(baseDayOfMonth + 14, lastDayOfMonth)
      ];

      for (const day of days) {
        const date = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
        const dateStr = date.toISOString().split('T')[0];

        if (existingDates.has(dateStr)) continue;

        incomeTransactions.push({
          budgetId,
          accountId,
          incomeSourceId: incomeSource.id,
          type: "income" as const,
          status: "pending" as const,
          amount: incomeSource.amount,
          description: `${incomeSource.name} (dia ${day})`,
          date,
          source: "scheduled",
        });
      }
    } else {
      // Monthly income (default)
      if (existingIncomeIds.has(incomeSource.id)) continue;

      const dueDay = Math.min(incomeSource.dayOfMonth!, lastDayOfMonth);
      const dueDate = new Date(Date.UTC(year, month - 1, dueDay, 12, 0, 0));

      incomeTransactions.push({
        budgetId,
        accountId,
        incomeSourceId: incomeSource.id,
        type: "income" as const,
        status: "pending" as const,
        amount: incomeSource.amount,
        description: `${incomeSource.name} (agendado)`,
        date: dueDate,
        source: "scheduled",
      });
    }
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
