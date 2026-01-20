import withAuthRequired from "@/shared/lib/auth/withAuthRequired";
import { db } from "@/db";
import { incomeSources, transactions, goals, goalContributions, recurringBills, categories, monthlyBudgetStatus, monthlyAllocations } from "@/db/schema";
import { eq, and, gte, lte, inArray } from "drizzle-orm";
import { getUserBudgetIds } from "@/shared/lib/api/permissions";
import {
  forbiddenError,
  successResponse,
  errorResponse,
} from "@/shared/lib/api/responses";

interface ScheduledTransaction {
  id: string;
  type: "expense" | "income";
  name: string;
  icon?: string | null;
  amount: number;
  dueDay: number;
  dueDate: string;
  isPaid: boolean;
  isAutoDebit?: boolean;
  isVariable?: boolean;
  sourceType: "recurring_bill" | "income_source" | "goal";
  sourceId: string;
  categoryId?: string;
  incomeSourceId?: string;
  goalId?: string;
  recurringBillId?: string;
}

// GET - Get scheduled/projected transactions for a period
export const GET = withAuthRequired(async (req, context) => {
  const { session } = context;
  const { searchParams } = new URL(req.url);
  const budgetId = searchParams.get("budgetId");
  const startDateParam = searchParams.get("startDate");
  const endDateParam = searchParams.get("endDate");
  // Legacy params for backwards compatibility
  const year = parseInt(searchParams.get("year") || new Date().getFullYear().toString());
  const month = parseInt(searchParams.get("month") || (new Date().getMonth() + 1).toString());

  if (!budgetId) {
    return errorResponse("budgetId is required", 400);
  }

  const budgetIds = await getUserBudgetIds(session.user.id);
  if (!budgetIds.includes(budgetId)) {
    return forbiddenError("Budget not found or access denied");
  }

  // Calculate date range - prefer startDate/endDate params, fallback to year/month
  let startDate: Date, endDate: Date;
  if (startDateParam && endDateParam) {
    startDate = new Date(startDateParam);
    endDate = new Date(endDateParam);
    // Ensure endDate includes the full day
    endDate.setHours(23, 59, 59, 999);
  } else {
    // Legacy: calculate from year/month
    startDate = new Date(year, month - 1, 1);
    endDate = new Date(year, month, 0, 23, 59, 59);
  }

  // Determine if this is a past period (for historical filtering)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const isPastPeriod = endDate < today;

  // Extract year/month from the date range for generating scheduled items
  const filterYear = startDate.getFullYear();
  const filterMonth = startDate.getMonth() + 1;
  // For date calculations, we need the last day of the month
  const lastDayOfMonth = new Date(filterYear, filterMonth, 0).getDate();

  // Get month status
  const [monthStatusRecord] = await db
    .select()
    .from(monthlyBudgetStatus)
    .where(
      and(
        eq(monthlyBudgetStatus.budgetId, budgetId),
        eq(monthlyBudgetStatus.year, filterYear),
        eq(monthlyBudgetStatus.month, filterMonth)
      )
    );

  const monthStatus = monthStatusRecord?.status || "planning";

  // If month is not "active", return empty scheduled transactions
  // The widget will show a banner to start the month
  if (monthStatus !== "active") {
    // Check if there are any allocations for this month
    const allocations = await db
      .select({ id: monthlyAllocations.id })
      .from(monthlyAllocations)
      .where(
        and(
          eq(monthlyAllocations.budgetId, budgetId),
          eq(monthlyAllocations.year, filterYear),
          eq(monthlyAllocations.month, filterMonth)
        )
      )
      .limit(1);

    return successResponse({
      year: filterYear,
      month: filterMonth,
      monthStatus,
      hasAllocations: allocations.length > 0,
      scheduledTransactions: [],
      totals: {
        expenses: 0,
        income: 0,
        paidExpenses: 0,
        paidIncome: 0,
      },
    });
  }

  // Fetch all data in parallel
  const [activeBills, incomeSourcesWithDay, existingTransactions, activeGoals, existingGoalContributions] = await Promise.all([
    // Active recurring bills with category info
    // For past periods, only include bills that existed at that time (createdAt <= endDate)
    db
      .select({
        bill: recurringBills,
        category: {
          id: categories.id,
          name: categories.name,
          icon: categories.icon,
        },
      })
      .from(recurringBills)
      .leftJoin(categories, eq(recurringBills.categoryId, categories.id))
      .where(
        and(
          eq(recurringBills.budgetId, budgetId),
          eq(recurringBills.isActive, true),
          ...(isPastPeriod ? [lte(recurringBills.createdAt, endDate)] : [])
        )
      ),

    // Income sources with dayOfMonth
    // For past periods, only include sources that existed at that time (createdAt <= endDate)
    db
      .select()
      .from(incomeSources)
      .where(
        and(
          eq(incomeSources.budgetId, budgetId),
          eq(incomeSources.isActive, true),
          ...(isPastPeriod ? [lte(incomeSources.createdAt, endDate)] : [])
        )
      ),

    // Get existing transactions for this month to check what's already paid
    db
      .select({
        recurringBillId: transactions.recurringBillId,
        incomeSourceId: transactions.incomeSourceId,
        status: transactions.status,
        amount: transactions.amount,
        type: transactions.type,
      })
      .from(transactions)
      .where(
        and(
          eq(transactions.budgetId, budgetId),
          gte(transactions.date, startDate),
          lte(transactions.date, endDate),
          inArray(transactions.status, ["pending", "cleared", "reconciled"])
        )
      ),

    // Get active goals with monthly targets
    // For past periods, only include goals that existed at that time (createdAt <= endDate)
    db
      .select()
      .from(goals)
      .where(
        and(
          eq(goals.budgetId, budgetId),
          eq(goals.isArchived, false),
          eq(goals.isCompleted, false),
          ...(isPastPeriod ? [lte(goals.createdAt, endDate)] : [])
        )
      ),

    // Get existing goal contributions for this month
    db
      .select()
      .from(goalContributions)
      .where(
        and(
          eq(goalContributions.year, year),
          eq(goalContributions.month, month)
        )
      ),
  ]);

  // Build map of already paid items (only count confirmed transactions)
  const paidBills = new Set<string>();
  const paidIncomeSources = new Set<string>();
  const paidGoals = new Set<string>();

  for (const tx of existingTransactions) {
    // Only mark as paid if status is "cleared" or "reconciled", not "pending"
    const isConfirmed = tx.status === "cleared" || tx.status === "reconciled";

    if (tx.recurringBillId && tx.type === "expense" && isConfirmed) {
      paidBills.add(tx.recurringBillId);
    }
    if (tx.incomeSourceId && tx.type === "income" && isConfirmed) {
      paidIncomeSources.add(tx.incomeSourceId);
    }
  }

  // Check which goals have contributions this month
  for (const contribution of existingGoalContributions) {
    paidGoals.add(contribution.goalId);
  }

  const scheduledTransactions: ScheduledTransaction[] = [];

  // Add scheduled expenses from recurring bills
  for (const { bill, category } of activeBills) {
    // Check frequency - skip yearly bills that don't match this month
    if (bill.frequency === "yearly" && bill.dueMonth !== filterMonth) continue;

    // Weekly bills - for now, just show one per month (TODO: implement weekly properly)
    if (bill.amount <= 0) continue;

    const dueDay = bill.dueDay ? Math.min(bill.dueDay, lastDayOfMonth) : 1;
    const dueDate = new Date(filterYear, filterMonth - 1, dueDay);

    scheduledTransactions.push({
      id: `bill-${bill.id}-${filterYear}-${filterMonth}`,
      type: "expense",
      name: bill.name,
      icon: category?.icon || "💰",
      amount: bill.amount,
      dueDay: dueDay,
      dueDate: dueDate.toISOString(),
      isPaid: paidBills.has(bill.id),
      isAutoDebit: bill.isAutoDebit ?? false,
      isVariable: bill.isVariable ?? false,
      sourceType: "recurring_bill",
      sourceId: bill.id,
      categoryId: bill.categoryId,
      recurringBillId: bill.id,
    });
  }

  // Add scheduled income from income sources
  for (const source of incomeSourcesWithDay) {
    if (source.dayOfMonth && source.amount > 0) {
      const dueDate = new Date(filterYear, filterMonth - 1, Math.min(source.dayOfMonth, lastDayOfMonth));

      scheduledTransactions.push({
        id: `income-${source.id}-${filterYear}-${filterMonth}`,
        type: "income",
        name: source.name,
        icon: source.type === "salary" ? "💼" : source.type === "benefit" ? "🎁" : "💰",
        amount: source.amount,
        dueDay: source.dayOfMonth,
        dueDate: dueDate.toISOString(),
        isPaid: paidIncomeSources.has(source.id),
        sourceType: "income_source",
        sourceId: source.id,
        incomeSourceId: source.id,
      });
    }
  }

  // Add goal monthly contributions as pending expenses
  for (const goal of activeGoals) {
    // Calculate monthly target based on remaining amount and time
    const now = new Date();
    const targetDate = new Date(goal.targetDate);
    const currentAmount = goal.currentAmount ?? 0;
    const targetAmount = goal.targetAmount;
    const remaining = targetAmount - currentAmount;

    if (remaining > 0) {
      const monthsRemaining = Math.max(
        1,
        (targetDate.getFullYear() - now.getFullYear()) * 12 +
          (targetDate.getMonth() - now.getMonth())
      );
      const monthlyTarget = Math.ceil(remaining / monthsRemaining);

      if (monthlyTarget > 0) {
        // Use the 1st day of the month as default due day for goals
        const dueDate = new Date(filterYear, filterMonth - 1, 1);

        scheduledTransactions.push({
          id: `goal-${goal.id}-${filterYear}-${filterMonth}`,
          type: "expense",
          name: `Meta: ${goal.name}`,
          icon: goal.icon || "🎯",
          amount: monthlyTarget,
          dueDay: 1,
          dueDate: dueDate.toISOString(),
          isPaid: paidGoals.has(goal.id),
          sourceType: "goal",
          sourceId: goal.id,
          goalId: goal.id,
        });
      }
    }
  }

  // Filter to only include items whose dueDate is within the requested range
  const filteredTransactions = scheduledTransactions.filter((item) => {
    const dueDate = new Date(item.dueDate);
    return dueDate >= startDate && dueDate <= endDate;
  });

  // Sort by due day
  filteredTransactions.sort((a, b) => a.dueDay - b.dueDay);

  // Calculate totals
  const totals = {
    expenses: filteredTransactions
      .filter((t) => t.type === "expense")
      .reduce((sum, t) => sum + t.amount, 0),
    income: filteredTransactions
      .filter((t) => t.type === "income")
      .reduce((sum, t) => sum + t.amount, 0),
    paidExpenses: scheduledTransactions
      .filter((t) => t.type === "expense" && t.isPaid)
      .reduce((sum, t) => sum + t.amount, 0),
    paidIncome: scheduledTransactions
      .filter((t) => t.type === "income" && t.isPaid)
      .reduce((sum, t) => sum + t.amount, 0),
  };

  return successResponse({
    year: filterYear,
    month: filterMonth,
    monthStatus,
    scheduledTransactions: filteredTransactions,
    totals,
  });
});
