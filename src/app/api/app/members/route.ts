import withAuthRequired from "@/shared/lib/auth/withAuthRequired";
import { db } from "@/db";
import { budgetMembers, categories, groups } from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { z } from "zod";
import { memberTypeEnum } from "@/db/schema/budget-members";
import { capitalizeWords } from "@/shared/lib/utils";
import { getUserBudgetMemberships } from "@/shared/lib/api/permissions";
import {
  validationError,
  forbiddenError,
  notFoundError,
  successResponse,
} from "@/shared/lib/api/responses";

const createMemberSchema = z.object({
  budgetId: z.string().uuid(),
  name: z.string().min(1).max(100),
  type: memberTypeEnum.refine((val) => val === "child" || val === "pet", {
    message: "Can only add dependents (child or pet) through this endpoint",
  }),
  color: z.string().optional(),
  monthlyPleasureBudget: z.number().int().min(0).default(0),
});

// GET - Get members for user's budgets
export const GET = withAuthRequired(async (req, context) => {
  const { session } = context;
  const { searchParams } = new URL(req.url);
  const budgetId = searchParams.get("budgetId");

  const memberships = await getUserBudgetMemberships(session.user.id);
  const budgetIds = memberships.map((m) => m.budgetId);

  if (budgetIds.length === 0) {
    return successResponse({ members: [] });
  }

  const members = await db
    .select()
    .from(budgetMembers)
    .where(
      budgetId
        ? and(
            eq(budgetMembers.budgetId, budgetId),
            inArray(budgetMembers.budgetId, budgetIds)
          )
        : inArray(budgetMembers.budgetId, budgetIds)
    );

  return successResponse({ members });
});

// POST - Add a dependent (child/pet) to budget
export const POST = withAuthRequired(async (req, context) => {
  const { session } = context;
  const body = await req.json();

  const validation = createMemberSchema.safeParse(body);
  if (!validation.success) {
    return validationError(validation.error);
  }

  const { budgetId, name, type, color, monthlyPleasureBudget } = validation.data;

  // Check user is owner or partner of the budget
  const memberships = await getUserBudgetMemberships(session.user.id);
  const membership = memberships.find((m) => m.budgetId === budgetId);

  if (!membership) {
    return notFoundError("Budget");
  }

  if (membership.type !== "owner" && membership.type !== "partner") {
    return forbiddenError("Only owner or partner can add members");
  }

  const capitalizedName = capitalizeWords(name);

  // Create the dependent member (no userId)
  const [newMember] = await db
    .insert(budgetMembers)
    .values({
      budgetId,
      name: capitalizedName,
      type,
      color,
      monthlyPleasureBudget,
      userId: null, // Dependents don't have user accounts
    })
    .returning();

  // Create a "Prazeres" category for this member
  const pleasuresGroup = await db
    .select()
    .from(groups)
    .where(eq(groups.code, "pleasures"))
    .limit(1);

  if (pleasuresGroup.length > 0) {
    await db.insert(categories).values({
      budgetId,
      groupId: pleasuresGroup[0].id,
      memberId: newMember.id,
      name: `Prazeres - ${capitalizedName}`,
      icon: type === "pet" ? "🐾" : "🎮",
      behavior: "refill_up",
      plannedAmount: monthlyPleasureBudget,
    });
  }

  return successResponse({ member: newMember }, 201);
});
