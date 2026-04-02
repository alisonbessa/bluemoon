import withAuthRequired from "@/shared/lib/auth/withAuthRequired";
import { db } from "@/db";
import {
  budgetMembers,
  financialAccounts,
  transactions,
  whatsappUsers,
  telegramUsers,
  goals,
  incomeSources,
  monthlyAllocations,
  recurringBills,
} from "@/db/schema";
import { eq, and, count, isNotNull, gt } from "drizzle-orm";
import { successResponse } from "@/shared/lib/api/responses";
import { checkUserAccess } from "@/shared/lib/users/checkPartnerAccess";

/**
 * GET /api/app/onboarding/checklist
 *
 * Returns the completion status of onboarding checklist items.
 */
export const GET = withAuthRequired(async (_request, context) => {
  const { session, getCurrentPlan } = context;
  const userId = session.user.id;

  const [accessInfo, currentPlan] = await Promise.all([
    checkUserAccess(userId),
    getCurrentPlan(),
  ]);
  const budgetId = accessInfo.primaryBudgetId;

  // Run all checks in parallel
  const [
    accountCount,
    transactionCount,
    whatsappConnection,
    telegramConnection,
    members,
    goalCount,
    hasContribution,
    allocationCount,
    recurringBillCount,
  ] = await Promise.all([
    // Has at least 1 financial account?
    budgetId
      ? db
          .select({ count: count() })
          .from(financialAccounts)
          .where(eq(financialAccounts.budgetId, budgetId))
          .then((r) => r[0]?.count ?? 0)
      : Promise.resolve(0),

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

    // Has contribution model configured? (any income source with contributionAmount set)
    budgetId
      ? db
          .select({ count: count() })
          .from(incomeSources)
          .where(
            and(
              eq(incomeSources.budgetId, budgetId),
              eq(incomeSources.isActive, true),
              isNotNull(incomeSources.contributionAmount)
            )
          )
          .then((r) => (r[0]?.count ?? 0) > 0)
      : Promise.resolve(false),

    // Has at least 1 monthly allocation OR recurring bill? (user configured budget)
    budgetId
      ? db
          .select({ count: count() })
          .from(monthlyAllocations)
          .where(
            and(
              eq(monthlyAllocations.budgetId, budgetId),
              gt(monthlyAllocations.allocated, 0)
            )
          )
          .then((r) => r[0]?.count ?? 0)
      : Promise.resolve(0),

    // Has at least 1 recurring bill?
    budgetId
      ? db
          .select({ count: count() })
          .from(recurringBills)
          .where(
            and(
              eq(recurringBills.budgetId, budgetId),
              eq(recurringBills.isActive, true)
            )
          )
          .then((r) => r[0]?.count ?? 0)
      : Promise.resolve(0),
  ]);

  return successResponse({
    hasBudget: allocationCount > 0 || (recurringBillCount as number) > 0,
    hasAccount: accountCount > 0,
    hasTransaction: transactionCount > 0,
    hasGoal: goalCount > 0,
    hasMessagingConnected:
      whatsappConnection.length > 0 || telegramConnection.length > 0,
    hasPartnerInvited: members.length > 1,
    hasContribution: hasContribution,
    isDuo: currentPlan?.codename === "duo" || (currentPlan?.quotas?.maxBudgetMembers ?? 1) >= 2 || accessInfo.hasPartnerAccess,
  });
});
