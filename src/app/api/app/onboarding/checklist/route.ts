import withAuthRequired from "@/shared/lib/auth/withAuthRequired";
import { db } from "@/db";
import {
  budgetMembers,
  transactions,
  whatsappUsers,
  telegramUsers,
  goals,
} from "@/db/schema";
import { eq, and, count } from "drizzle-orm";
import { successResponse } from "@/shared/lib/api/responses";
import { checkUserAccess } from "@/shared/lib/users/checkPartnerAccess";

/**
 * GET /api/app/onboarding/checklist
 *
 * Returns the completion status of onboarding checklist items.
 */
export const GET = withAuthRequired(async (_request, context) => {
  const { session } = context;
  const userId = session.user.id;

  const accessInfo = await checkUserAccess(userId);
  const budgetId = accessInfo.primaryBudgetId;

  // Run all checks in parallel
  const [
    transactionCount,
    whatsappConnection,
    telegramConnection,
    members,
    goalCount,
  ] = await Promise.all([
    // Has at least 1 transaction?
    budgetId
      ? db
          .select({ count: count() })
          .from(transactions)
          .where(eq(transactions.budgetId, budgetId))
          .then((r) => r[0]?.count ?? 0)
      : Promise.resolve(0),

    // Has WhatsApp connected?
    db
      .select({ id: whatsappUsers.id })
      .from(whatsappUsers)
      .where(eq(whatsappUsers.userId, userId))
      .limit(1),

    // Has Telegram connected?
    db
      .select({ id: telegramUsers.id })
      .from(telegramUsers)
      .where(eq(telegramUsers.userId, userId))
      .limit(1),

    // Budget members (to check if partner was invited)
    budgetId
      ? db
          .select({ id: budgetMembers.id })
          .from(budgetMembers)
          .where(eq(budgetMembers.budgetId, budgetId))
      : Promise.resolve([]),

    // Has at least 1 goal?
    budgetId
      ? db
          .select({ count: count() })
          .from(goals)
          .where(
            and(eq(goals.budgetId, budgetId), eq(goals.isCompleted, false))
          )
          .then((r) => r[0]?.count ?? 0)
      : Promise.resolve(0),
  ]);

  return successResponse({
    hasBudget: !!budgetId,
    hasTransaction: transactionCount > 0,
    hasGoal: goalCount > 0,
    hasMessagingConnected:
      whatsappConnection.length > 0 || telegramConnection.length > 0,
    hasPartnerInvited: members.length > 1,
    isDuo: members.length > 1 || accessInfo.hasPartnerAccess,
  });
});
