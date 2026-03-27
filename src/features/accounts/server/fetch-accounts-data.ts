import { db } from "@/db";
import { financialAccounts, budgetMembers, transactions } from "@/db/schema";
import { eq, and, inArray, isNull, gte, lte } from "drizzle-orm";
import {
  getUserBudgetIds,
  getUserMemberIdInBudget,
  getPartnerPrivacyLevel,
} from "@/shared/lib/api/permissions";
import { getViewModeCondition, type ViewMode } from "@/shared/lib/api/view-mode-filter";
import { getBillingCycleDates } from "@/shared/lib/billing-cycle";
import type { Account } from "../types";

export interface AccountsDataResult {
  accounts: Account[];
}

/**
 * Fetch accounts data directly from the database.
 * Used by the Server Component to provide SSR fallback data.
 * Mirrors the logic in GET /api/app/accounts.
 */
export async function fetchAccountsData(params: {
  userId: string;
  budgetId: string;
  viewMode?: ViewMode;
}): Promise<AccountsDataResult> {
  const { userId, budgetId, viewMode = "mine" } = params;

  const budgetIds = await getUserBudgetIds(userId);

  if (budgetIds.length === 0) {
    return { accounts: [] };
  }

  // Get user's member ID for visibility filtering
  const userMemberId = await getUserMemberIdInBudget(userId, budgetId);

  // Base condition: account belongs to user's budgets
  const budgetCondition = and(
    eq(financialAccounts.budgetId, budgetId),
    inArray(financialAccounts.budgetId, budgetIds),
  );

  // View mode filtering
  let visibilityCondition;
  if (userMemberId) {
    const partnerPrivacy =
      viewMode === "all"
        ? await getPartnerPrivacyLevel(userId, budgetId)
        : undefined;
    visibilityCondition = getViewModeCondition({
      viewMode,
      userMemberId,
      ownerField: financialAccounts.ownerId,
      partnerPrivacy,
    });
  } else {
    visibilityCondition = isNull(financialAccounts.ownerId);
  }

  const whereCondition = visibilityCondition
    ? and(budgetCondition, visibilityCondition)
    : budgetCondition;

  const userAccounts = await db
    .select({
      id: financialAccounts.id,
      budgetId: financialAccounts.budgetId,
      ownerId: financialAccounts.ownerId,
      name: financialAccounts.name,
      type: financialAccounts.type,
      color: financialAccounts.color,
      icon: financialAccounts.icon,
      balance: financialAccounts.balance,
      clearedBalance: financialAccounts.clearedBalance,
      creditLimit: financialAccounts.creditLimit,
      closingDay: financialAccounts.closingDay,
      dueDay: financialAccounts.dueDay,
      isArchived: financialAccounts.isArchived,
      displayOrder: financialAccounts.displayOrder,
      createdAt: financialAccounts.createdAt,
      updatedAt: financialAccounts.updatedAt,
      owner: {
        id: budgetMembers.id,
        name: budgetMembers.name,
        type: budgetMembers.type,
        color: budgetMembers.color,
      },
    })
    .from(financialAccounts)
    .leftJoin(budgetMembers, eq(financialAccounts.ownerId, budgetMembers.id))
    .where(whereCondition);

  // Calculate currentBill for credit card accounts using billing cycle
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  const creditCardAccounts = userAccounts.filter(
    (a) => a.type === "credit_card" && a.closingDay,
  );

  const billsMap = new Map<string, number>();

  if (creditCardAccounts.length > 0) {
    let globalStart: Date | null = null;
    let globalEnd: Date | null = null;
    const billingRanges = new Map<string, { start: Date; end: Date }>();

    for (const account of creditCardAccounts) {
      const range = getBillingCycleDates(
        account.closingDay!,
        currentYear,
        currentMonth,
      );
      billingRanges.set(account.id, range);
      if (!globalStart || range.start < globalStart) globalStart = range.start;
      if (!globalEnd || range.end > globalEnd) globalEnd = range.end;
    }

    const ccIds = creditCardAccounts.map((a) => a.id);
    const ccBills = await db
      .select({
        accountId: transactions.accountId,
        amount: transactions.amount,
        date: transactions.date,
      })
      .from(transactions)
      .where(
        and(
          inArray(transactions.accountId, ccIds),
          eq(transactions.type, "expense"),
          inArray(transactions.status, ["pending", "cleared", "reconciled"]),
          gte(transactions.date, globalStart!),
          lte(transactions.date, globalEnd!),
        ),
      );

    for (const account of creditCardAccounts) {
      const range = billingRanges.get(account.id)!;
      const startTime = range.start.getTime();
      const endTime = range.end.getTime();

      let total = 0;
      for (const row of ccBills) {
        if (row.accountId === account.id) {
          const txTime = new Date(row.date).getTime();
          if (txTime >= startTime && txTime <= endTime) {
            total += Number(row.amount) || 0;
          }
        }
      }
      billsMap.set(account.id, total);
    }
  }

  const accountsWithBill = userAccounts.map((account) => ({
    ...account,
    currentBill:
      account.type === "credit_card" && account.closingDay
        ? (billsMap.get(account.id) ?? 0)
        : null,
  }));

  // Cast is safe: the select shape + computed currentBill match the Account interface.
  // Drizzle infers nullable joins (owner) and bigint fields differently from our domain type,
  // but the runtime values are structurally compatible.
  return { accounts: accountsWithBill as Account[] };
}
