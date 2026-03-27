import withAuthRequired from "@/shared/lib/auth/withAuthRequired";
import { requireActiveSubscription } from "@/shared/lib/auth/withSubscriptionRequired";
import { withRateLimit, rateLimits } from "@/shared/lib/security/rate-limit";
import { db } from "@/db";
import { financialAccounts, budgetMembers, transactions } from "@/db/schema";
import { eq, and, inArray, or, isNull, gte, lte, sql } from "drizzle-orm";
import { capitalizeWords } from "@/shared/lib/utils";
import {
  getUserBudgetIds,
  getUserMemberIdInBudget,
  getPartnerPrivacyLevel,
} from "@/shared/lib/api/permissions";
import {
  validationError,
  forbiddenError,
  successResponse,
} from "@/shared/lib/api/responses";
import { createAccountSchema } from "@/shared/lib/validations/account.schema";
import { getBillingCycleDates } from "@/shared/lib/billing-cycle";
import { parseViewMode, getViewModeCondition } from "@/shared/lib/api/view-mode-filter";

// GET - Get accounts for user's budgets
// Supports viewMode query param: mine | shared | all
export const GET = withAuthRequired(async (req, context) => {
  const { session } = context;
  const { searchParams } = new URL(req.url);
  const budgetId = searchParams.get("budgetId");
  const viewMode = parseViewMode(searchParams);

  const budgetIds = await getUserBudgetIds(session.user.id);

  if (budgetIds.length === 0) {
    return successResponse({ accounts: [] });
  }

  // Get user's member ID for visibility filtering
  const activeBudgetId = budgetId || budgetIds[0];
  const userMemberId = await getUserMemberIdInBudget(session.user.id, activeBudgetId);

  // Base condition: account belongs to user's budgets
  const budgetCondition = budgetId
    ? and(eq(financialAccounts.budgetId, budgetId), inArray(financialAccounts.budgetId, budgetIds))
    : inArray(financialAccounts.budgetId, budgetIds);

  // View mode filtering
  let visibilityCondition;
  if (userMemberId) {
    const partnerPrivacy = viewMode === "all"
      ? await getPartnerPrivacyLevel(session.user.id, activeBudgetId)
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
  // Single grouped query instead of N+1 (fix 3.4)
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  const creditCardAccounts = userAccounts.filter(
    (a) => a.type === "credit_card" && a.closingDay
  );

  const billsMap = new Map<string, number>();

  if (creditCardAccounts.length > 0) {
    // Calculate the widest date range across all billing cycles to minimize data fetched
    let globalStart: Date | null = null;
    let globalEnd: Date | null = null;
    const billingRanges = new Map<string, { start: Date; end: Date }>();

    for (const account of creditCardAccounts) {
      const range = getBillingCycleDates(account.closingDay!, currentYear, currentMonth);
      billingRanges.set(account.id, range);
      if (!globalStart || range.start < globalStart) globalStart = range.start;
      if (!globalEnd || range.end > globalEnd) globalEnd = range.end;
    }

    // Single query with the widest date range, grouped by accountId (fix 3.4)
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
          lte(transactions.date, globalEnd!)
        )
      );

    // Aggregate per account filtered by its specific billing cycle
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
    currentBill: account.type === "credit_card" && account.closingDay
      ? (billsMap.get(account.id) ?? 0)
      : null,
  }));

  return successResponse({ accounts: accountsWithBill });
});

// POST - Create a new account
export const POST = withRateLimit(withAuthRequired(async (req, context) => {
  const { session } = context;

  // Require active subscription for creating accounts
  const subscriptionError = await requireActiveSubscription(session.user.id);
  if (subscriptionError) return subscriptionError;

  const body = await req.json();

  const validation = createAccountSchema.safeParse(body);
  if (!validation.success) {
    return validationError(validation.error);
  }

  const { budgetId, ...accountData } = validation.data;

  // Check user has access to budget
  const budgetIds = await getUserBudgetIds(session.user.id);
  if (!budgetIds.includes(budgetId)) {
    return forbiddenError("Budget not found or access denied");
  }

  // Get display order
  const existingAccounts = await db
    .select()
    .from(financialAccounts)
    .where(eq(financialAccounts.budgetId, budgetId));

  const [newAccount] = await db
    .insert(financialAccounts)
    .values({
      ...accountData,
      name: capitalizeWords(accountData.name),
      budgetId,
      displayOrder: existingAccounts.length,
    })
    .returning();

  return successResponse({ account: newAccount }, 201);
}), rateLimits.api, "app-accounts-post");
