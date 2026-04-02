import withAuthRequired from "@/shared/lib/auth/withAuthRequired";
import { db } from "@/db";
import { users } from "@/db/schema/user";
import {
  budgets,
  budgetMembers,
  financialAccounts,
  transactions,
  categories,
  goals,
  goalContributions,
  goalMemberSettings,
  monthlyAllocations,
  monthlyGroupAllocations,
  monthlyIncomeAllocations,
  monthlyBudgetStatus,
  incomeSources,
  recurringBills,
} from "@/db/schema";
import { eq, inArray } from "drizzle-orm";
import { successResponse, internalError } from "@/shared/lib/api/responses";
import { getUserBudgetIds } from "@/shared/lib/api/permissions";
import { createLogger } from "@/shared/lib/logger";

const logger = createLogger("api:account:reset");

/**
 * POST /api/app/account/reset
 *
 * Deletes all financial data (budgets, transactions, accounts, etc.)
 * but keeps the user account and profile. Resets onboardingCompletedAt
 * so the user goes through setup again.
 */
export const POST = withAuthRequired(async (_req, context) => {
  const { session } = context;
  const userId = session.user.id;

  try {
    const budgetIds = await getUserBudgetIds(userId);

    if (budgetIds.length > 0) {
      await db.transaction(async (tx) => {
        // Delete in order respecting FK constraints (children first)
        await tx.delete(goalContributions).where(
          inArray(goalContributions.goalId,
            tx.select({ id: goals.id }).from(goals).where(inArray(goals.budgetId, budgetIds))
          )
        );
        await tx.delete(goalMemberSettings).where(
          inArray(goalMemberSettings.goalId,
            tx.select({ id: goals.id }).from(goals).where(inArray(goals.budgetId, budgetIds))
          )
        );
        await tx.delete(goals).where(inArray(goals.budgetId, budgetIds));
        await tx.delete(transactions).where(inArray(transactions.budgetId, budgetIds));
        await tx.delete(recurringBills).where(inArray(recurringBills.budgetId, budgetIds));
        await tx.delete(monthlyAllocations).where(inArray(monthlyAllocations.budgetId, budgetIds));
        await tx.delete(monthlyGroupAllocations).where(inArray(monthlyGroupAllocations.budgetId, budgetIds));
        await tx.delete(monthlyIncomeAllocations).where(inArray(monthlyIncomeAllocations.budgetId, budgetIds));
        await tx.delete(monthlyBudgetStatus).where(inArray(monthlyBudgetStatus.budgetId, budgetIds));
        await tx.delete(incomeSources).where(inArray(incomeSources.budgetId, budgetIds));
        await tx.delete(financialAccounts).where(inArray(financialAccounts.budgetId, budgetIds));
        await tx.delete(categories).where(inArray(categories.budgetId, budgetIds));
        await tx.delete(budgetMembers).where(inArray(budgetMembers.budgetId, budgetIds));
        await tx.delete(budgets).where(inArray(budgets.id, budgetIds));
      });
    }

    // Reset onboarding so user goes through setup again
    await db.update(users)
      .set({ onboardingCompletedAt: null })
      .where(eq(users.id, userId));

    logger.info(`User ${userId} reset all financial data`);

    return successResponse({ message: "Data reset successfully" });
  } catch (error) {
    logger.error("Error resetting data:", error);
    return internalError("Failed to reset data");
  }
});
