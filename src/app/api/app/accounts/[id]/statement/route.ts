import withAuthRequired from "@/shared/lib/auth/withAuthRequired";
import { db } from "@/db";
import { transactions, financialAccounts, categories } from "@/db/schema";
import { eq, and, inArray, gte, lte } from "drizzle-orm";
import { getUserBudgetIds } from "@/shared/lib/api/permissions";
import {
  notFoundError,
  successResponse,
  errorResponse,
} from "@/shared/lib/api/responses";
import { getBillingCycleDates } from "@/shared/lib/billing-cycle";

// GET - Get credit card statement (transactions in a billing cycle)
// Query params: year, month (the billing cycle month)
export const GET = withAuthRequired(async (req, context) => {
  const { session } = context;
  const params = await context.params;
  const accountId = params.id as string;
  const { searchParams } = new URL(req.url);

  const year = parseInt(searchParams.get("year") || new Date().getFullYear().toString());
  const month = parseInt(searchParams.get("month") || (new Date().getMonth() + 1).toString());

  const budgetIds = await getUserBudgetIds(session.user.id);
  if (budgetIds.length === 0) {
    return notFoundError("Account");
  }

  // Validate account exists, belongs to user's budget, and is a credit card
  const [account] = await db
    .select({
      id: financialAccounts.id,
      name: financialAccounts.name,
      icon: financialAccounts.icon,
      type: financialAccounts.type,
      closingDay: financialAccounts.closingDay,
      dueDay: financialAccounts.dueDay,
      creditLimit: financialAccounts.creditLimit,
      budgetId: financialAccounts.budgetId,
    })
    .from(financialAccounts)
    .where(
      and(
        eq(financialAccounts.id, accountId),
        inArray(financialAccounts.budgetId, budgetIds),
      )
    );

  if (!account) {
    return notFoundError("Account");
  }

  if (account.type !== "credit_card") {
    return errorResponse("Account is not a credit card", 400);
  }

  // Get billing cycle dates
  const closingDay = account.closingDay ?? 1;
  const cycle = getBillingCycleDates(closingDay, year, month);

  // Fetch all expense transactions in this billing cycle
  const statementTransactions = await db
    .select({
      id: transactions.id,
      amount: transactions.amount,
      description: transactions.description,
      date: transactions.date,
      status: transactions.status,
      isInstallment: transactions.isInstallment,
      installmentNumber: transactions.installmentNumber,
      totalInstallments: transactions.totalInstallments,
      category: {
        id: categories.id,
        name: categories.name,
        icon: categories.icon,
      },
    })
    .from(transactions)
    .leftJoin(categories, eq(transactions.categoryId, categories.id))
    .where(
      and(
        eq(transactions.accountId, accountId),
        eq(transactions.type, "expense"),
        inArray(transactions.status, ["pending", "cleared", "reconciled"]),
        gte(transactions.date, cycle.start),
        lte(transactions.date, cycle.end),
      )
    )
    .orderBy(transactions.date);

  const total = statementTransactions.reduce(
    (sum, tx) => sum + Math.abs(Number(tx.amount) || 0), 0
  );

  return successResponse({
    account: {
      id: account.id,
      name: account.name,
      icon: account.icon,
      closingDay,
      dueDay: account.dueDay,
      creditLimit: account.creditLimit,
    },
    cycle: {
      year,
      month,
      start: cycle.start.toISOString(),
      end: cycle.end.toISOString(),
    },
    transactions: statementTransactions,
    total,
  });
});
