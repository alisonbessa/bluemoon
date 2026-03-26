import withAuthRequired from "@/shared/lib/auth/withAuthRequired";
import { requireActiveSubscription } from "@/shared/lib/auth/withSubscriptionRequired";
import { withRateLimit, rateLimits } from "@/shared/lib/security/rate-limit";
import { db } from "@/db";
import { transactions, financialAccounts, categories, incomeSources, budgetMembers } from "@/db/schema";
import { eq, and, inArray, desc, gte, lte, sql } from "drizzle-orm";
import { getUserBudgetIds, getUserMemberIdInBudget, getPartnerPrivacyLevel } from "@/shared/lib/api/permissions";
import { createTransactionSchema } from "@/shared/lib/validations/transaction.schema";
import {
  validationError,
  forbiddenError,
  successResponse,
  errorResponse,
  safePagination,
} from "@/shared/lib/api/responses";
import {
  getFirstInstallmentDate,
  calculateInstallmentDates,
} from "@/shared/lib/billing-cycle";
import { parseViewMode, getViewModeCondition } from "@/shared/lib/api/view-mode-filter";

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
    const partnerPrivacy = viewMode === "all"
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

  // Validate categoryId belongs to the budget and get its scope (memberId)
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
    categoryScopeMemberId = cat.memberId;
  }

  // Validate incomeSourceId and get its scope (memberId)
  let incomeSourceScopeMemberId: string | null = null;
  if (incomeSourceId) {
    const [source] = await db
      .select({ id: incomeSources.id, memberId: incomeSources.memberId })
      .from(incomeSources)
      .where(eq(incomeSources.id, incomeSourceId));
    if (source) {
      incomeSourceScopeMemberId = source.memberId;
    }
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
    const installmentAmount = Math.round(amount / totalInstallments);

    const isCreditCard = sourceAccount.type === "credit_card";
    const closingDay = sourceAccount.closingDay;

    // Calculate installment dates
    let installmentDates: Date[];
    if (isCreditCard && closingDay) {
      const firstDate = getFirstInstallmentDate(transactionDate, closingDay);
      installmentDates = calculateInstallmentDates(firstDate, totalInstallments);
    } else {
      installmentDates = Array.from({ length: totalInstallments }, (_, i) => {
        const d = new Date(transactionDate);
        d.setMonth(d.getMonth() + i);
        return d;
      });
    }

    // Wrap everything in a transaction for atomicity (fix 1.2)
    const createdTransactions = await db.transaction(async (tx) => {
      // Create parent transaction (first installment)
      const [parentTransaction] = await tx
        .insert(transactions)
        .values({
          budgetId,
          accountId,
          categoryId: type === "expense" ? categoryId : undefined,
          incomeSourceId: type === "income" ? incomeSourceId : undefined,
          toAccountId: type === "transfer" ? toAccountId : undefined,
          memberId: scopeMemberId,
          paidByMemberId,
          type,
          amount: installmentAmount,
          description,
          notes,
          date: installmentDates[0],
          isInstallment: true,
          installmentNumber: 1,
          totalInstallments,
          source: "web",
        })
        .returning();

      // PERFORMANCE: Batch insert remaining installments
      const installmentValues = Array.from({ length: totalInstallments - 1 }, (_, i) => ({
        budgetId,
        accountId,
        categoryId: type === "expense" ? categoryId : undefined,
        incomeSourceId: type === "income" ? incomeSourceId : undefined,
        toAccountId: type === "transfer" ? toAccountId : undefined,
        memberId: scopeMemberId,
        paidByMemberId,
        type,
        amount: installmentAmount,
        description,
        notes,
        date: installmentDates[i + 1],
        isInstallment: true,
        installmentNumber: i + 2,
        totalInstallments,
        parentTransactionId: parentTransaction.id,
        source: "web" as const,
      }));

      const remainingInstallments = installmentValues.length > 0
        ? await tx.insert(transactions).values(installmentValues).returning()
        : [];

      // Atomic balance update — no read-then-write race (fix 1.1)
      // Credit cards: debit total amount (all installments affect the credit limit)
      // Other accounts: only the first installment affects balance now
      const balanceAmount = isCreditCard ? amount : installmentAmount;
      const balanceChange = type === "income" ? balanceAmount : -Math.abs(balanceAmount);

      await tx
        .update(financialAccounts)
        .set({
          balance: sql`${financialAccounts.balance} + ${balanceChange}`,
          updatedAt: new Date(),
        })
        .where(eq(financialAccounts.id, accountId));

      // Handle transfers in installments (fix 2.5)
      if (type === "transfer" && toAccountId) {
        // Credit cards: full amount credited to destination
        // Other accounts: only first installment credited to destination
        const destAmount = isCreditCard ? Math.abs(amount) : Math.abs(installmentAmount);
        await tx
          .update(financialAccounts)
          .set({
            balance: sql`${financialAccounts.balance} + ${destAmount}`,
            updatedAt: new Date(),
          })
          .where(eq(financialAccounts.id, toAccountId));
      }

      return [parentTransaction, ...remainingInstallments];
    });

    return successResponse({ transactions: createdTransactions }, 201);
  }

  // Create single transaction and update balances atomically
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
        status: status || "pending",
        amount,
        description,
        notes,
        date: transactionDate,
        source: "web",
      })
      .returning();

    // Atomic balance update (fix 1.1) — no read-then-write race condition
    const balanceChange = type === "income" ? amount : -Math.abs(amount);

    await tx
      .update(financialAccounts)
      .set({
        balance: sql`${financialAccounts.balance} + ${balanceChange}`,
        updatedAt: new Date(),
      })
      .where(eq(financialAccounts.id, accountId));

    // For transfers, update destination account atomically
    if (type === "transfer" && toAccountId) {
      await tx
        .update(financialAccounts)
        .set({
          balance: sql`${financialAccounts.balance} + ${Math.abs(amount)}`,
          updatedAt: new Date(),
        })
        .where(eq(financialAccounts.id, toAccountId));
    }

    return created;
  });

  return successResponse({ transaction: newTransaction }, 201);
}), rateLimits.api, "app-transactions-post");
