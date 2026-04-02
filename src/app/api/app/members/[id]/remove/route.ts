import withAuthRequired from "@/shared/lib/auth/withAuthRequired";
import { db } from "@/db";
import {
  budgets,
  budgetMembers,
  financialAccounts,
  categories,
  transactions,
  incomeSources,
  goals,
  goalContributions,
  goalMemberSettings,
  monthlyAllocations,
  recurringBills,
} from "@/db/schema";
import { eq, and, inArray, isNull } from "drizzle-orm";
import { getUserBudgetIds, getUserMemberIdInBudget } from "@/shared/lib/api/permissions";
import {
  forbiddenError,
  notFoundError,
  errorResponse,
  successResponse,
} from "@/shared/lib/api/responses";
import { createLogger } from "@/shared/lib/logger";

const logger = createLogger("api:members:remove");

/**
 * POST /api/app/members/[id]/remove
 *
 * Remove a partner from the budget. Creates a new Solo budget for
 * the partner with their personal data (accounts, categories,
 * transactions, income sources, goals).
 *
 * Only the budget owner can remove a partner.
 */
export const POST = withAuthRequired(async (req, context) => {
  const { session } = context;
  const params = await context.params;
  const memberId = params.id as string;

  const budgetIds = await getUserBudgetIds(session.user.id);
  if (budgetIds.length === 0) {
    return notFoundError("Budget");
  }

  // Get the member to remove
  const [memberToRemove] = await db
    .select()
    .from(budgetMembers)
    .where(
      and(
        eq(budgetMembers.id, memberId),
        inArray(budgetMembers.budgetId, budgetIds)
      )
    );

  if (!memberToRemove) {
    return notFoundError("Member");
  }

  if (memberToRemove.type !== "partner") {
    return errorResponse("Apenas parceiros podem ser removidos", 400);
  }

  if (!memberToRemove.userId) {
    return errorResponse("Parceiro não tem conta vinculada", 400);
  }

  const budgetId = memberToRemove.budgetId;

  // Verify the requester is the owner
  const ownerMemberId = await getUserMemberIdInBudget(session.user.id, budgetId);
  const [ownerMember] = await db
    .select()
    .from(budgetMembers)
    .where(eq(budgetMembers.id, ownerMemberId!));

  if (!ownerMember || ownerMember.type !== "owner") {
    return forbiddenError("Apenas o dono do orçamento pode remover parceiros");
  }

  // Get the current budget for reference
  const [currentBudget] = await db
    .select()
    .from(budgets)
    .where(eq(budgets.id, budgetId));

  if (!currentBudget) {
    return notFoundError("Budget");
  }

  try {
    const result = await db.transaction(async (tx) => {
      // 1. Create new Solo budget for the partner
      const [newBudget] = await tx
        .insert(budgets)
        .values({
          name: `Orçamento de ${memberToRemove.name}`,
          currency: currentBudget.currency,
          privacyMode: "visible",
        })
        .returning();

      // 2. Create a new owner member for the partner in their new budget
      const [newMember] = await tx
        .insert(budgetMembers)
        .values({
          budgetId: newBudget.id,
          userId: memberToRemove.userId,
          name: memberToRemove.name,
          type: "owner",
          color: memberToRemove.color,
          monthlyPleasureBudget: memberToRemove.monthlyPleasureBudget,
        })
        .returning();

      // 3. Move personal accounts (ownerId = partner)
      const partnerAccounts = await tx
        .select()
        .from(financialAccounts)
        .where(
          and(
            eq(financialAccounts.budgetId, budgetId),
            eq(financialAccounts.ownerId, memberId)
          )
        );

      for (const account of partnerAccounts) {
        await tx
          .update(financialAccounts)
          .set({
            budgetId: newBudget.id,
            ownerId: newMember.id,
            updatedAt: new Date(),
          })
          .where(eq(financialAccounts.id, account.id));

        // Move transactions linked to this account
        await tx
          .update(transactions)
          .set({
            budgetId: newBudget.id,
            memberId: newMember.id,
            paidByMemberId: newMember.id,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(transactions.budgetId, budgetId),
              eq(transactions.accountId, account.id)
            )
          );
      }

      // 4. Move personal categories (memberId = partner)
      const partnerCategories = await tx
        .select()
        .from(categories)
        .where(
          and(
            eq(categories.budgetId, budgetId),
            eq(categories.memberId, memberId)
          )
        );

      for (const category of partnerCategories) {
        // Move allocations for this category
        await tx
          .update(monthlyAllocations)
          .set({ budgetId: newBudget.id })
          .where(eq(monthlyAllocations.categoryId, category.id));

        // Move recurring bills for this category
        await tx
          .update(recurringBills)
          .set({ budgetId: newBudget.id })
          .where(
            and(
              eq(recurringBills.budgetId, budgetId),
              eq(recurringBills.categoryId, category.id)
            )
          );

        // Move transactions for this category that belong to partner
        await tx
          .update(transactions)
          .set({
            budgetId: newBudget.id,
            memberId: newMember.id,
            paidByMemberId: newMember.id,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(transactions.budgetId, budgetId),
              eq(transactions.categoryId, category.id),
              eq(transactions.memberId, memberId)
            )
          );

        // Move the category itself
        await tx
          .update(categories)
          .set({
            budgetId: newBudget.id,
            memberId: newMember.id,
            updatedAt: new Date(),
          })
          .where(eq(categories.id, category.id));
      }

      // 5. Move personal income sources
      await tx
        .update(incomeSources)
        .set({
          budgetId: newBudget.id,
          memberId: newMember.id,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(incomeSources.budgetId, budgetId),
            eq(incomeSources.memberId, memberId)
          )
        );

      // 6. Move personal goals
      const partnerGoals = await tx
        .select()
        .from(goals)
        .where(
          and(
            eq(goals.budgetId, budgetId),
            eq(goals.memberId, memberId)
          )
        );

      for (const goal of partnerGoals) {
        await tx
          .update(goalContributions)
          .set({ memberId: newMember.id })
          .where(eq(goalContributions.goalId, goal.id));

        await tx
          .update(goalMemberSettings)
          .set({ memberId: newMember.id })
          .where(
            and(
              eq(goalMemberSettings.goalId, goal.id),
              eq(goalMemberSettings.memberId, memberId)
            )
          );

        await tx
          .update(goals)
          .set({
            budgetId: newBudget.id,
            memberId: newMember.id,
            updatedAt: new Date(),
          })
          .where(eq(goals.id, goal.id));
      }

      // 7. Clean up shared goal member settings for the removed partner
      await tx
        .delete(goalMemberSettings)
        .where(eq(goalMemberSettings.memberId, memberId));

      // 8. Remove remaining shared transactions scoped to partner
      // (set memberId to null = shared, paidByMemberId to owner)
      await tx
        .update(transactions)
        .set({
          memberId: null,
          paidByMemberId: ownerMemberId!,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(transactions.budgetId, budgetId),
            eq(transactions.memberId, memberId)
          )
        );

      await tx
        .update(transactions)
        .set({
          paidByMemberId: ownerMemberId!,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(transactions.budgetId, budgetId),
            eq(transactions.paidByMemberId, memberId)
          )
        );

      // 9. Remove the partner member from original budget
      await tx
        .delete(budgetMembers)
        .where(eq(budgetMembers.id, memberId));

      // 10. Reset privacy to visible (no longer duo)
      await tx
        .update(budgets)
        .set({ privacyMode: "visible", updatedAt: new Date() })
        .where(eq(budgets.id, budgetId));

      return {
        newBudgetId: newBudget.id,
        newMemberId: newMember.id,
        movedAccounts: partnerAccounts.length,
        movedCategories: partnerCategories.length,
        movedGoals: partnerGoals.length,
        partnerName: memberToRemove.name,
        partnerEmail: memberToRemove.userId, // userId is used to look up email later
      };
    });

    logger.info(`Partner removed from budget ${budgetId}:`, {
      removedMemberId: memberId,
      newBudgetId: result.newBudgetId,
      movedAccounts: result.movedAccounts,
      movedCategories: result.movedCategories,
      movedGoals: result.movedGoals,
    });

    return successResponse({
      message: "Parceiro removido com sucesso",
      newBudgetId: result.newBudgetId,
      partnerName: result.partnerName,
      movedAccounts: result.movedAccounts,
      movedCategories: result.movedCategories,
      movedGoals: result.movedGoals,
    });
  } catch (error) {
    logger.error("Error removing partner:", error);
    return errorResponse("Erro ao remover parceiro. Tente novamente.", 500);
  }
});
