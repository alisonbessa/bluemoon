import withAuthRequired from "@/shared/lib/auth/withAuthRequired";
import { requireActiveSubscription } from "@/shared/lib/auth/withSubscriptionRequired";
import { withRateLimit, rateLimits } from "@/shared/lib/security/rate-limit";
import { db } from "@/db";
import { transactions, financialAccounts, categories, incomeSources, budgetMembers } from "@/db/schema";
import { eq, and, inArray, desc, gte, lte } from "drizzle-orm";
import { getUserBudgetIds, getUserMemberIdInBudget, getPartnerPrivacyLevel } from "@/shared/lib/api/permissions";
import { createTransactionSchema } from "@/shared/lib/validations/transaction.schema";
import {
  validationError,
  forbiddenError,
  successResponse,
  errorResponse,
  safePagination,
} from "@/shared/lib/api/responses";
import { createInstallmentTransactions, applyTransactionBalanceChange } from "@/shared/lib/transactions/installments";
import { parseViewMode, getViewModeCondition } from "@/shared/lib/api/view-mode-filter";
import { recordAuditLog } from "@/shared/lib/security/audit-log";

// GET - Get transactions for user's budgets
export const GET = withAuthRequired(async (req, context) => {
  const { session } = context;
  const { searchParams } = new URL(req.url);

  const budgetId = searchParams.get("budgetId");
  const accountId = searchParams.get("accountId");
  const categoryId = searchParams.get("categoryId");
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");
  const viewMode = parseViewMode(searchParams);
  const { limit, offset } = safePagination(searchParams);

  const budgetIds = await getUserBudgetIds(session.user.id);
  if (budgetIds.length === 0) {
    return successResponse({ transactions: [], total: 0 });
  }

  const activeBudgetId = budgetId || budgetIds[0];
  const userMemberId = await getUserMemberIdInBudget(session.user.id, activeBudgetId);

  // Build conditions
  const conditions = [
    budgetId
      ? and(eq(transactions.budgetId, budgetId), inArray(transactions.budgetId, budgetIds))
      : inArray(transactions.budgetId, budgetIds),
  ];

  // View mode filtering on transactions.memberId
  if (userMemberId) {
    const partnerPrivacy = (viewMode === "all" || viewMode === "mine")
      ? await getPartnerPrivacyLevel(session.user.id, activeBudgetId)
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

  if (accountId) {
    conditions.push(eq(transactions.accountId, accountId));
  }

  if (categoryId) {
    conditions.push(eq(transactions.categoryId, categoryId));
  }

  if (startDate) {
    conditions.push(gte(transactions.date, new Date(startDate)));
  }

  if (endDate) {
    conditions.push(lte(transactions.date, new Date(endDate)));
  }

  const userTransactions = await db
    .select({
      transaction: transactions,
      account: {
        id: financialAccounts.id,
        name: financialAccounts.name,
        icon: financialAccounts.icon,
        type: financialAccounts.type,
        color: financialAccounts.color,
      },
      category: {
        id: categories.id,
        name: categories.name,
        icon: categories.icon,
        color: categories.color,
        groupId: categories.groupId,
      },
      incomeSource: {
        id: incomeSources.id,
        name: incomeSources.name,
        type: incomeSources.type,
      },
    })
    .from(transactions)
    .leftJoin(financialAccounts, eq(transactions.accountId, financialAccounts.id))
    .leftJoin(categories, eq(transactions.categoryId, categories.id))
    .leftJoin(incomeSources, eq(transactions.incomeSourceId, incomeSources.id))
    .where(and(...conditions))
    .orderBy(desc(transactions.date), desc(transactions.createdAt))
    .limit(limit)
    .offset(offset);

  return successResponse({
    transactions: userTransactions.map((t) => ({
      ...t.transaction,
      account: t.account,
      category: t.category,
      incomeSource: t.incomeSource,
    })),
  });
});

// POST - Create a new transaction (with installment support)
export const POST = withRateLimit(withAuthRequired(async (req, context) => {
  const { session } = context;

  // Require active subscription for creating transactions
  const subscriptionError = await requireActiveSubscription(session.user.id);
  if (subscriptionError) return subscriptionError;

  const body = await req.json();

  const validation = createTransactionSchema.safeParse(body);
  if (!validation.success) {
    return validationError(validation.error);
  }

  const {
    budgetId,
    accountId,
    categoryId,
    incomeSourceId,
    toAccountId,
    recurringBillId,
    type,
    status,
    amount,
    description,
    notes,
    date,
    isInstallment,
    totalInstallments,
    paidByMemberId: requestedPaidByMemberId,
  } = validation.data;

  // Check user has access to budget
  const budgetIds = await getUserBudgetIds(session.user.id);
  if (!budgetIds.includes(budgetId)) {
    return forbiddenError("Budget not found or access denied");
  }

  // Get current user's member ID in this budget
  const userMemberIdInBudget = await getUserMemberIdInBudget(session.user.id, budgetId);

  // Validate transfer has toAccountId
  if (type === "transfer" && !toAccountId) {
    return errorResponse("Transfer requires toAccountId", 400);
  }

  // Source and destination accounts must differ for transfers
  if (type === "transfer" && toAccountId === accountId) {
    return errorResponse("Source and destination accounts must be different", 400);
  }

  // Validate accountId belongs to the budget (fix 5.1)
  const [sourceAccount] = await db
    .select()
    .from(financialAccounts)
    .where(
      and(
        eq(financialAccounts.id, accountId),
        eq(financialAccounts.budgetId, budgetId)
      )
    );
  if (!sourceAccount) {
    return errorResponse("Account does not belong to this budget", 400);
  }

  // Validate toAccountId belongs to the budget (fix 5.1)
  if (toAccountId) {
    const [destAccount] = await db
      .select({ id: financialAccounts.id })
      .from(financialAccounts)
      .where(
        and(
          eq(financialAccounts.id, toAccountId),
          eq(financialAccounts.budgetId, budgetId)
        )
      );
    if (!destAccount) {
      return errorResponse("Destination account does not belong to this budget", 400);
    }
  }

  // Validate categoryId belongs to the budget and get its scope (memberId).
  // A category that belongs to another member must not be usable by the
  // current user — categories with NULL memberId are shared and allowed.
  let categoryScopeMemberId: string | null = null;
  if (categoryId) {
    const [cat] = await db
      .select({ id: categories.id, memberId: categories.memberId })
      .from(categories)
      .where(
        and(
          eq(categories.id, categoryId),
          eq(categories.budgetId, budgetId)
        )
      );
    if (!cat) {
      return errorResponse("Category does not belong to this budget", 400);
    }
    if (cat.memberId !== null && cat.memberId !== userMemberIdInBudget) {
      return forbiddenError("Category belongs to another member");
    }
    categoryScopeMemberId = cat.memberId;
  }

  // Validate incomeSourceId belongs to the same budget and get its scope (memberId)
  let incomeSourceScopeMemberId: string | null = null;
  if (incomeSourceId) {
    const [source] = await db
      .select({ id: incomeSources.id, memberId: incomeSources.memberId })
      .from(incomeSources)
      .where(
        and(
          eq(incomeSources.id, incomeSourceId),
          eq(incomeSources.budgetId, budgetId)
        )
      );
    if (!source) {
      return errorResponse("Income source does not belong to this budget", 400);
    }
    incomeSourceScopeMemberId = source.memberId;
  }

  // Derive scope memberId based on transaction type:
  // - Expenses: inherit from category (NULL = shared, set = personal)
  // - Income: inherit from income source
  // - Transfer: personal to current user
  const scopeMemberId = type === "expense"
    ? categoryScopeMemberId
    : type === "income"
      ? (incomeSourceScopeMemberId ?? userMemberIdInBudget ?? null)
      : (userMemberIdInBudget ?? null);

  // Determine paidByMemberId: use request value or default to current user
  const paidByMemberId = requestedPaidByMemberId || userMemberIdInBudget;
  if (!paidByMemberId) {
    return errorResponse("Could not determine member for this budget", 400);
  }

  // Validate paidByMemberId belongs to the budget
  if (requestedPaidByMemberId && requestedPaidByMemberId !== userMemberIdInBudget) {
    const [member] = await db
      .select({ id: budgetMembers.id })
      .from(budgetMembers)
      .where(
        and(
          eq(budgetMembers.id, requestedPaidByMemberId),
          eq(budgetMembers.budgetId, budgetId)
        )
      );
    if (!member) {
      return errorResponse("Paid-by member does not belong to this budget", 400);
    }
  }

  const transactionDate = typeof date === "string" ? new Date(date) : date;

  // Handle installments — all inside a single db.transaction() for atomicity (fix 1.2)
  if (isInstallment && totalInstallments && totalInstallments > 1) {
    const createdTransactions = await db.transaction(async (tx) =>
      createInstallmentTransactions({
        tx,
        budgetId,
        accountId,
        accountType: sourceAccount.type,
        categoryId,
        incomeSourceId,
        toAccountId,
        memberId: scopeMemberId,
        paidByMemberId,
        type,
        totalAmount: amount,
        totalInstallments,
        description,
        notes,
        firstDate: transactionDate,
        source: "web",
      })
    );

    await recordAuditLog({
      userId: session.user.id,
      action: "transaction.create",
      resource: "transaction",
      resourceId: createdTransactions[0]?.id,
      details: {
        budgetId,
        type,
        amount,
        totalInstallments,
        isInstallment: true,
      },
      req,
    });

    return successResponse({ transactions: createdTransactions }, 201);
  }

  // Create single transaction and update balances atomically.
  // applyTransactionBalanceChange handles both balance and clearedBalance
  // (mirrored when the transaction is created already confirmed).
  const effectiveStatus = status || "pending";
  const newTransaction = await db.transaction(async (tx) => {
    const [created] = await tx
      .insert(transactions)
      .values({
        budgetId,
        accountId,
        categoryId: type === "expense" ? categoryId : undefined,
        incomeSourceId: type === "income" ? incomeSourceId : undefined,
        recurringBillId,
        memberId: scopeMemberId,
        paidByMemberId,
        toAccountId,
        type,
        status: effectiveStatus,
        amount,
        description,
        notes,
        date: transactionDate,
        source: "web",
      })
      .returning();

    await applyTransactionBalanceChange(tx, {
      accountId,
      type,
      amount,
      toAccountId,
      status: effectiveStatus,
    });

    return created;
  });

  await recordAuditLog({
    userId: session.user.id,
    action: "transaction.create",
    resource: "transaction",
    resourceId: newTransaction.id,
    details: { budgetId, type, amount },
    req,
  });

  return successResponse({ transaction: newTransaction }, 201);
}), rateLimits.api, "app-transactions-post");
