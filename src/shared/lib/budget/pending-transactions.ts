import { db } from "@/db";
import {
  incomeSources,
  transactions,
  financialAccounts,
  recurringBills,
  categories,
  monthlyBudgetStatus,
} from "@/db/schema";
import { eq, and, gte, lte, isNotNull, inArray, ne, or, isNull } from "drizzle-orm";
import { getScopeFromCategory, getScopeFromIncomeSource } from "@/shared/lib/transactions/scope";

interface EnsureResult {
  created: number;
  expenses: number;
  income: number;
  noAccount: boolean;
}

/**
 * Check if a bill is active for a given month based on its startDate/endDate bounds.
 * Returns false if the month falls outside the bill's active period.
 */
function isBillActiveForMonth(
  bill: { startDate: Date | null; endDate: Date | null },
  year: number,
  month: number
): boolean {
  const monthStart = new Date(Date.UTC(year, month - 1, 1));
  const monthEnd = new Date(Date.UTC(year, month, 0, 23, 59, 59));

  if (bill.startDate && bill.startDate > monthEnd) return false;
  if (bill.endDate && bill.endDate < monthStart) return false;
  return true;
}

/**
 * Ensure pending transactions exist for a given month.
 * This implements "lazy generation" - transactions are created on-demand
 * when queried, rather than requiring a manual "start month" action.
 *
 * DESIGN NOTE (issue 1.4): Auto-generated pending transactions intentionally
 * do NOT update account balances. The `balance` field represents confirmed
 * state. Pending transactions are reflected in UI projections calculated on
 * the fly. This differs from manually-created transactions via POST which
 * do update the balance regardless of status — a known trade-off that keeps
 * the UX responsive for manual entries while preventing balance pollution
 * from auto-generated future transactions.
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
  // Don't generate pending transactions for past months
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  if (year < currentYear || (year === currentYear && month < currentMonth)) {
    return { created: 0, expenses: 0, income: 0, noAccount: false };
  }

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

  // Get all active recurring bills whose category and account are still
  // available (not archived). Joining filters them out at the SQL level so
  // archived setups stop generating new pending rows.
  const activeBillsRows = await db
    .select({
      bill: recurringBills,
      categoryArchived: categories.isArchived,
      accountArchived: financialAccounts.isArchived,
    })
    .from(recurringBills)
    .leftJoin(categories, eq(recurringBills.categoryId, categories.id))
    .leftJoin(financialAccounts, eq(recurringBills.accountId, financialAccounts.id))
    .where(
      and(
        eq(recurringBills.budgetId, budgetId),
        eq(recurringBills.isActive, true),
        or(isNull(categories.isArchived), eq(categories.isArchived, false)),
        or(isNull(financialAccounts.isArchived), eq(financialAccounts.isArchived, false))
      )
    );
  const activeBills = activeBillsRows.map((r) => r.bill);

  // Get income sources with dayOfMonth (skip archived destination accounts)
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
        isNotNull(incomeSources.dayOfMonth),
        or(isNull(financialAccounts.isArchived), eq(financialAccounts.isArchived, false))
      )
    );

  // Get default account for income transactions without specific account.
  // Must NOT be a credit card or archived — those would corrupt projections.
  const defaultAccount = await db
    .select()
    .from(financialAccounts)
    .where(
      and(
        eq(financialAccounts.budgetId, budgetId),
        eq(financialAccounts.isArchived, false),
        ne(financialAccounts.type, "credit_card")
      )
    )
    .limit(1);

  if (defaultAccount.length === 0) {
    return { created: 0, expenses: 0, income: 0, noAccount: true };
  }

  // Fetch categories for scope (memberId) derivation
  const categoryIds = [...new Set(activeBills.map((b) => b.categoryId))];
  const billCategories = categoryIds.length > 0
    ? await db
        .select({ id: categories.id, memberId: categories.memberId })
        .from(categories)
        .where(inArray(categories.id, categoryIds))
    : [];

  // Fetch account owners for paidByMemberId
  const allAccountIds = [
    ...new Set([
      ...activeBills.map((b) => b.accountId),
      ...incomeSourcesWithDay.map(({ account }) => account?.id).filter(Boolean),
      defaultAccount[0].id,
    ]),
  ] as string[];
  const accountOwners = allAccountIds.length > 0
    ? await db
        .select({ id: financialAccounts.id, ownerId: financialAccounts.ownerId })
        .from(financialAccounts)
        .where(inArray(financialAccounts.id, allAccountIds))
    : [];
  const accountOwnerMap = new Map(accountOwners.map((a) => [a.id, a.ownerId]));

  // Build income source list for scope helper
  const incomeSourceList = incomeSourcesWithDay.map(({ incomeSource }) => ({
    id: incomeSource.id,
    memberId: incomeSource.memberId,
  }));

  // Create expense transactions from recurring bills.
  // Bills with isAutoDebit=true and due date <= today are created as "cleared" (auto-confirmed).
  // We compute "today" as the end of the current UTC day so that auto-debit
  // doesn't fire one day early in negative-offset timezones (where local
  // midnight precedes UTC noon used in dueDate construction).
  const nowUtc = new Date();
  const today = new Date(Date.UTC(
    nowUtc.getUTCFullYear(),
    nowUtc.getUTCMonth(),
    nowUtc.getUTCDate(),
    23, 59, 59, 999,
  ));
  const expenseTransactions = [];
  for (const bill of activeBills) {
    if (bill.amount <= 0) continue;

    // Skip bills outside their active date range (fix 4.3)
    if (!isBillActiveForMonth(bill, year, month)) continue;

    // Derive scope and payer for this bill
    const billPaidBy = accountOwnerMap.get(bill.accountId);
    if (!billPaidBy) continue; // Skip bills with accounts that have no owner
    const billMemberId = getScopeFromCategory(bill.categoryId, billCategories, billPaidBy);

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

          const autoConfirmWeekly = bill.isAutoDebit && date <= today;
          expenseTransactions.push({
            budgetId,
            accountId: bill.accountId,
            categoryId: bill.categoryId,
            recurringBillId: bill.id,
            type: "expense" as const,
            status: autoConfirmWeekly ? "cleared" as const : "pending" as const,
            amount: bill.amount,
            description: `${bill.name} (${date.getUTCDate()}/${month})`,
            date,
            source: "recurring",
            memberId: billMemberId,
            paidByMemberId: billPaidBy,
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
      const autoConfirmYearly = bill.isAutoDebit && dueDate <= today;

      expenseTransactions.push({
        budgetId,
        accountId: bill.accountId,
        categoryId: bill.categoryId,
        recurringBillId: bill.id,
        type: "expense" as const,
        status: autoConfirmYearly ? "cleared" as const : "pending" as const,
        amount: bill.amount,
        description: bill.name,
        date: dueDate,
        source: "recurring",
        memberId: billMemberId,
        paidByMemberId: billPaidBy,
      });
    } else {
      // Monthly bills (default)
      // Skip if already has transaction this month
      if (existingBillIds.has(bill.id)) continue;

      const dueDay = bill.dueDay ? Math.min(bill.dueDay, lastDayOfMonth) : 1;
      const dueDate = new Date(Date.UTC(year, month - 1, dueDay, 12, 0, 0));
      const autoConfirm = bill.isAutoDebit && dueDate <= today;

      expenseTransactions.push({
        budgetId,
        accountId: bill.accountId,
        categoryId: bill.categoryId,
        recurringBillId: bill.id,
        type: "expense" as const,
        status: autoConfirm ? "cleared" as const : "pending" as const,
        amount: bill.amount,
        description: bill.name,
        date: dueDate,
        source: "recurring",
        memberId: billMemberId,
        paidByMemberId: billPaidBy,
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

    // Derive scope and payer for this income source
    const incomeAccountOwner = accountOwnerMap.get(accountId);
    if (!incomeAccountOwner) continue; // Skip if account has no owner
    const incomeMemberId = getScopeFromIncomeSource(incomeSource.id, incomeSourceList, incomeAccountOwner);
    const incomePaidBy = incomeSource.memberId || incomeAccountOwner;

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
            memberId: incomeMemberId,
            paidByMemberId: incomePaidBy,
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
          memberId: incomeMemberId,
          paidByMemberId: incomePaidBy,
        });
      }
    } else if (frequency === "annual") {
      // Annual income: only in the specified month
      if (incomeSource.monthOfYear !== month) continue;
      if (existingIncomeIds.has(incomeSource.id)) continue;

      const dueDay = Math.min(incomeSource.dayOfMonth ?? 1, lastDayOfMonth);
      const dueDate = new Date(Date.UTC(year, month - 1, dueDay, 12, 0, 0));

      incomeTransactions.push({
        budgetId,
        accountId,
        incomeSourceId: incomeSource.id,
        type: "income" as const,
        status: "pending" as const,
        amount: incomeSource.amount,
        description: incomeSource.name,
        date: dueDate,
        source: "scheduled",
        memberId: incomeMemberId,
        paidByMemberId: incomePaidBy,
      });
    } else if (frequency === "once") {
      // One-time income: only in the specific month/year
      if (incomeSource.monthOfYear !== month) continue;
      if (incomeSource.yearOfPayment && incomeSource.yearOfPayment !== year) continue;
      if (existingIncomeIds.has(incomeSource.id)) continue;

      const dueDay = Math.min(incomeSource.dayOfMonth ?? 1, lastDayOfMonth);
      const dueDate = new Date(Date.UTC(year, month - 1, dueDay, 12, 0, 0));

      incomeTransactions.push({
        budgetId,
        accountId,
        incomeSourceId: incomeSource.id,
        type: "income" as const,
        status: "pending" as const,
        amount: incomeSource.amount,
        description: incomeSource.name,
        date: dueDate,
        source: "scheduled",
        memberId: incomeMemberId,
        paidByMemberId: incomePaidBy,
      });
    } else {
      // Monthly income (default)
      if (existingIncomeIds.has(incomeSource.id)) continue;

      const dueDay = Math.min(incomeSource.dayOfMonth ?? 1, lastDayOfMonth);
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
        memberId: incomeMemberId,
        paidByMemberId: incomePaidBy,
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
    noAccount: false,
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

/**
 * Auto-activate a month if it's in "planning" state or doesn't exist yet.
 * No-op if month is already "active" or "closed".
 */
export async function autoActivateMonth(
  budgetId: string,
  year: number,
  month: number
): Promise<void> {
  const [existing] = await db
    .select({ id: monthlyBudgetStatus.id, status: monthlyBudgetStatus.status })
    .from(monthlyBudgetStatus)
    .where(
      and(
        eq(monthlyBudgetStatus.budgetId, budgetId),
        eq(monthlyBudgetStatus.year, year),
        eq(monthlyBudgetStatus.month, month)
      )
    )
    .limit(1);

  if (!existing) {
    await db.insert(monthlyBudgetStatus).values({
      budgetId,
      year,
      month,
      status: "active",
      startedAt: new Date(),
    });
  } else if (existing.status === "planning") {
    await db
      .update(monthlyBudgetStatus)
      .set({ status: "active", startedAt: new Date(), updatedAt: new Date() })
      .where(eq(monthlyBudgetStatus.id, existing.id));
  }
}
