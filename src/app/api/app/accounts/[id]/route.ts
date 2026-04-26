import withAuthRequired from "@/shared/lib/auth/withAuthRequired";
import { requireActiveSubscription } from "@/shared/lib/auth/withSubscriptionRequired";
import { db } from "@/db";
import { financialAccounts, transactions, recurringBills, incomeSources } from "@/db/schema";
import { eq, and, inArray, ne, or, sql } from "drizzle-orm";
import { capitalizeWords } from "@/shared/lib/utils";
import { getUserBudgetIds } from "@/shared/lib/api/permissions";
import {
  validationError,
  notFoundError,
  successResponse,
  errorResponse,
} from "@/shared/lib/api/responses";
import { updateAccountSchema } from "@/shared/lib/validations";
import { recordAuditLog } from "@/shared/lib/security/audit-log";

// GET - Get a specific account
export const GET = withAuthRequired(async (req, context) => {
  const { session } = context;
  const params = await context.params;
  const accountId = params.id as string;

  const budgetIds = await getUserBudgetIds(session.user.id);
  if (budgetIds.length === 0) {
    return notFoundError("Account");
  }

  const [account] = await db
    .select()
    .from(financialAccounts)
    .where(
      and(
        eq(financialAccounts.id, accountId),
        inArray(financialAccounts.budgetId, budgetIds)
      )
    );

  if (!account) {
    return notFoundError("Account");
  }

  return successResponse({ account });
});

// PATCH - Update an account
export const PATCH = withAuthRequired(async (req, context) => {
  const { session } = context;

  // Require active subscription for modifying accounts
  const subscriptionError = await requireActiveSubscription(session.user.id);
  if (subscriptionError) return subscriptionError;

  const params = await context.params;
  const accountId = params.id as string;
  const body = await req.json();

  const budgetIds = await getUserBudgetIds(session.user.id);
  if (budgetIds.length === 0) {
    return notFoundError("Account");
  }

  // Check account exists and user has access
  const [existingAccount] = await db
    .select()
    .from(financialAccounts)
    .where(
      and(
        eq(financialAccounts.id, accountId),
        inArray(financialAccounts.budgetId, budgetIds)
      )
    );

  if (!existingAccount) {
    return notFoundError("Account");
  }

  const validation = updateAccountSchema.safeParse(body);
  if (!validation.success) {
    return validationError(validation.error);
  }

  // Validate paymentAccountId belongs to the same budget and is not a credit card or self
  if (validation.data.paymentAccountId) {
    const [paymentAccount] = await db
      .select({ id: financialAccounts.id, type: financialAccounts.type })
      .from(financialAccounts)
      .where(
        and(
          eq(financialAccounts.id, validation.data.paymentAccountId),
          eq(financialAccounts.budgetId, existingAccount.budgetId),
          ne(financialAccounts.id, accountId),
          ne(financialAccounts.type, "credit_card"),
          eq(financialAccounts.isArchived, false),
        )
      );
    if (!paymentAccount) {
      return errorResponse("Payment account not found or invalid", 400);
    }
  }

  const updateData = {
    ...validation.data,
    ...(validation.data.name && { name: capitalizeWords(validation.data.name) }),
    updatedAt: new Date(),
  };

  const [updatedAccount] = await db
    .update(financialAccounts)
    .set(updateData)
    .where(eq(financialAccounts.id, accountId))
    .returning();

  await recordAuditLog({
    userId: session.user.id,
    action: "account.update",
    resource: "account",
    resourceId: accountId,
    details: { budgetId: existingAccount.budgetId },
    req,
  });

  return successResponse({ account: updatedAccount });
});

// DELETE - Delete an account
export const DELETE = withAuthRequired(async (req, context) => {
  const { session } = context;

  // Require active subscription for deleting accounts
  const subscriptionError = await requireActiveSubscription(session.user.id);
  if (subscriptionError) return subscriptionError;

  const params = await context.params;
  const accountId = params.id as string;

  const budgetIds = await getUserBudgetIds(session.user.id);
  if (budgetIds.length === 0) {
    return notFoundError("Account");
  }

  // Check account exists and user has access
  const [existingAccount] = await db
    .select()
    .from(financialAccounts)
    .where(
      and(
        eq(financialAccounts.id, accountId),
        inArray(financialAccounts.budgetId, budgetIds)
      )
    );

  if (!existingAccount) {
    return notFoundError("Account");
  }

  // Hard-deleting a financial account would cascade-delete every transaction
  // attached to it (FK cascade) and silently destroy the balance recorded on
  // counterpart accounts that received transfers from/to it. Refuse the
  // delete when references exist and ask the user to archive instead.
  const [{ refCount }] = await db
    .select({ refCount: sql<number>`COUNT(*)::int` })
    .from(transactions)
    .where(
      or(
        eq(transactions.accountId, accountId),
        eq(transactions.toAccountId, accountId)
      )!
    );

  if (refCount > 0) {
    return errorResponse(
      "Esta conta possui transações registradas. Arquive-a em vez de excluir.",
      400
    );
  }

  // Also block when other entities still depend on this account.
  const [{ billCount }] = await db
    .select({ billCount: sql<number>`COUNT(*)::int` })
    .from(recurringBills)
    .where(eq(recurringBills.accountId, accountId));

  const [{ incomeCount }] = await db
    .select({ incomeCount: sql<number>`COUNT(*)::int` })
    .from(incomeSources)
    .where(eq(incomeSources.accountId, accountId));

  if (billCount > 0 || incomeCount > 0) {
    return errorResponse(
      "Esta conta está em uso por contas recorrentes ou fontes de renda. Reaponte-as antes de excluir.",
      400
    );
  }

  await db.delete(financialAccounts).where(eq(financialAccounts.id, accountId));

  await recordAuditLog({
    userId: session.user.id,
    action: "account.delete",
    resource: "account",
    resourceId: accountId,
    details: {
      budgetId: existingAccount.budgetId,
      name: existingAccount.name,
      type: existingAccount.type,
    },
    req,
  });

  return successResponse({ success: true });
});
