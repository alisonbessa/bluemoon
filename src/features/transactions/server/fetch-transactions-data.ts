import { db } from "@/db";
import {
  transactions,
  financialAccounts,
  categories,
  incomeSources,
} from "@/db/schema";
import { eq, and, inArray, desc, gte, lte } from "drizzle-orm";
import {
  getUserBudgetIds,
  getUserMemberIdInBudget,
  getPartnerPrivacyLevel,
} from "@/shared/lib/api/permissions";
import { getViewModeCondition, type ViewMode } from "@/shared/lib/api/view-mode-filter";
import type { Transaction } from "../types";

/**
 * Result shape returned by fetchTransactionsData.
 * Matches the shape consumed by useTransactionData's SWR hook.
 */
export interface TransactionsDataResult {
  transactions: Transaction[];
}

/**
 * Fetch transactions directly from the database for server-side rendering.
 * Mirrors the GET logic in /api/app/transactions but runs server-side.
 */
export async function fetchTransactionsData(opts: {
  userId: string;
  budgetId: string;
  year: number;
  month: number;
  viewMode: ViewMode;
}): Promise<TransactionsDataResult | null> {
  const { userId, budgetId, year, month, viewMode } = opts;

  // Verify access
  const budgetIds = await getUserBudgetIds(userId);
  if (!budgetIds.includes(budgetId)) {
    return null;
  }

  const userMemberId = await getUserMemberIdInBudget(userId, budgetId);

  // Date range for the month
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59);

  // Build conditions
  const conditions = [
    inArray(transactions.budgetId, budgetIds),
    gte(transactions.date, startDate),
    lte(transactions.date, endDate),
  ];

  // View mode filtering
  if (userMemberId) {
    const partnerPrivacy =
      viewMode === "all"
        ? await getPartnerPrivacyLevel(userId, budgetId)
        : undefined;
    const viewCondition = getViewModeCondition({
      viewMode,
      userMemberId,
      ownerField: transactions.memberId,
      partnerPrivacy,
      isTransactionFilter: true,
      paidByField: transactions.paidByMemberId,
    });
    if (viewCondition) {
      conditions.push(viewCondition);
    }
  }

  const userTransactions = await db
    .select({
      transaction: transactions,
      account: financialAccounts,
      category: categories,
      incomeSource: incomeSources,
    })
    .from(transactions)
    .leftJoin(financialAccounts, eq(transactions.accountId, financialAccounts.id))
    .leftJoin(categories, eq(transactions.categoryId, categories.id))
    .leftJoin(incomeSources, eq(transactions.incomeSourceId, incomeSources.id))
    .where(and(...conditions))
    .orderBy(desc(transactions.date), desc(transactions.createdAt))
    .limit(500);

  return {
    transactions: userTransactions.map((t) => ({
      ...t.transaction,
      date: t.transaction.date instanceof Date
        ? t.transaction.date.toISOString()
        : String(t.transaction.date),
      account: t.account,
      category: t.category,
      incomeSource: t.incomeSource,
    })) as Transaction[],
  };
}
