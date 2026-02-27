import withAuthRequired from "@/shared/lib/auth/withAuthRequired";
import { db } from "@/db";
import { budgetMembers } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getUserBudgetIds, getUserMemberIdInBudget } from "@/shared/lib/api/permissions";
import {
  validationError,
  forbiddenError,
  successResponse,
  errorResponse,
} from "@/shared/lib/api/responses";
import { privacyLevelEnum } from "@/db/schema/budget-members";
import { z } from "zod";

const updatePrivacySchema = z.object({
  budgetId: z.string(),
  privacyLevel: privacyLevelEnum,
});

// PATCH - Update current member's privacy level
export const PATCH = withAuthRequired(async (req, context) => {
  const { session } = context;
  const body = await req.json();

  const validation = updatePrivacySchema.safeParse(body);
  if (!validation.success) {
    return validationError(validation.error);
  }

  const { budgetId, privacyLevel } = validation.data;

  // Check user has access to budget
  const budgetIds = await getUserBudgetIds(session.user.id);
  if (!budgetIds.includes(budgetId)) {
    return forbiddenError("Budget not found or access denied");
  }

  const userMemberId = await getUserMemberIdInBudget(session.user.id, budgetId);
  if (!userMemberId) {
    return errorResponse("Member not found", 404);
  }

  const [updated] = await db
    .update(budgetMembers)
    .set({ privacyLevel, updatedAt: new Date() })
    .where(
      and(
        eq(budgetMembers.id, userMemberId),
        eq(budgetMembers.budgetId, budgetId)
      )
    )
    .returning();

  return successResponse({ member: updated });
});
