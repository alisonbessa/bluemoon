import withAuthRequired from "@/shared/lib/auth/withAuthRequired";
import { requireActiveSubscription } from "@/shared/lib/auth/withSubscriptionRequired";
import { db } from "@/db";
import { financialAccounts } from "@/db/schema";
import { eq, and, inArray, ne } from "drizzle-orm";
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
