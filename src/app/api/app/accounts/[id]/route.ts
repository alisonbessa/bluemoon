import withAuthRequired from "@/shared/lib/auth/withAuthRequired";
import { db } from "@/db";
import { financialAccounts } from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { capitalizeWords } from "@/shared/lib/utils";
import { getUserBudgetIds } from "@/shared/lib/api/permissions";
import {
  validationError,
  notFoundError,
  successResponse,
} from "@/shared/lib/api/responses";
import { updateAccountSchema } from "@/shared/lib/validations";

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

  return successResponse({ account: updatedAccount });
});

// DELETE - Delete an account
export const DELETE = withAuthRequired(async (req, context) => {
  const { session } = context;
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

  return successResponse({ success: true });
});
