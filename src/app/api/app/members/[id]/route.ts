import withAuthRequired from "@/shared/lib/auth/withAuthRequired";
import { db } from "@/db";
import { budgetMembers, categories } from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { z } from "zod";
import { capitalizeWords } from "@/shared/lib/utils";
import { getUserBudgetMemberships } from "@/shared/lib/api/permissions";
import {
  validationError,
  forbiddenError,
  notFoundError,
  successResponse,
} from "@/shared/lib/api/responses";

const updateMemberSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  color: z.string().optional(),
  monthlyPleasureBudget: z.number().int().min(0).optional(),
});

// GET - Get a specific member
export const GET = withAuthRequired(async (req, context) => {
  const { session } = context;
  const params = await context.params;
  const memberId = params.id as string;

  const memberships = await getUserBudgetMemberships(session.user.id);
  const budgetIds = memberships.map((m) => m.budgetId);

  if (budgetIds.length === 0) {
    return notFoundError("Member");
  }

  const [member] = await db
    .select()
    .from(budgetMembers)
    .where(
      and(
        eq(budgetMembers.id, memberId),
        inArray(budgetMembers.budgetId, budgetIds)
      )
    );

  if (!member) {
    return notFoundError("Member");
  }

  return successResponse({ member });
});

// PATCH - Update a member
export const PATCH = withAuthRequired(async (req, context) => {
  const { session } = context;
  const params = await context.params;
  const memberId = params.id as string;
  const body = await req.json();

  const memberships = await getUserBudgetMemberships(session.user.id);
  const budgetIds = memberships.map((m) => m.budgetId);

  if (budgetIds.length === 0) {
    return notFoundError("Member");
  }

  const [existingMember] = await db
    .select()
    .from(budgetMembers)
    .where(
      and(
        eq(budgetMembers.id, memberId),
        inArray(budgetMembers.budgetId, budgetIds)
      )
    );

  if (!existingMember) {
    return notFoundError("Member");
  }

  // Check user is owner or partner
  const membership = memberships.find((m) => m.budgetId === existingMember.budgetId);
  if (!membership || (membership.type !== "owner" && membership.type !== "partner")) {
    return forbiddenError("Only owner or partner can update members");
  }

  // Can't update owner/partner members (they update themselves via profile)
  if (existingMember.type === "owner" || existingMember.type === "partner") {
    return forbiddenError("Cannot update owner or partner through this endpoint");
  }

  const validation = updateMemberSchema.safeParse(body);
  if (!validation.success) {
    return validationError(validation.error);
  }

  const capitalizedName = validation.data.name ? capitalizeWords(validation.data.name) : undefined;

  const [updatedMember] = await db
    .update(budgetMembers)
    .set({
      ...validation.data,
      ...(capitalizedName && { name: capitalizedName }),
      updatedAt: new Date(),
    })
    .where(eq(budgetMembers.id, memberId))
    .returning();

  // Update the related "Prazeres" category if monthlyPleasureBudget changed
  if (validation.data.monthlyPleasureBudget !== undefined) {
    await db
      .update(categories)
      .set({
        plannedAmount: validation.data.monthlyPleasureBudget,
        updatedAt: new Date(),
      })
      .where(eq(categories.memberId, memberId));
  }

  // Update category name if member name changed
  if (capitalizedName) {
    await db
      .update(categories)
      .set({
        name: `Prazeres - ${capitalizedName}`,
        updatedAt: new Date(),
      })
      .where(eq(categories.memberId, memberId));
  }

  return successResponse({ member: updatedMember });
});

// DELETE - Remove a dependent member
export const DELETE = withAuthRequired(async (req, context) => {
  const { session } = context;
  const params = await context.params;
  const memberId = params.id as string;

  const memberships = await getUserBudgetMemberships(session.user.id);
  const budgetIds = memberships.map((m) => m.budgetId);

  if (budgetIds.length === 0) {
    return notFoundError("Member");
  }

  const [existingMember] = await db
    .select()
    .from(budgetMembers)
    .where(
      and(
        eq(budgetMembers.id, memberId),
        inArray(budgetMembers.budgetId, budgetIds)
      )
    );

  if (!existingMember) {
    return notFoundError("Member");
  }

  // Check user is owner
  const membership = memberships.find((m) => m.budgetId === existingMember.budgetId);
  if (!membership || membership.type !== "owner") {
    return forbiddenError("Only owner can remove members");
  }

  // Can't delete owner
  if (existingMember.type === "owner") {
    return forbiddenError("Cannot remove the budget owner");
  }

  // Delete the member (categories will be cascade deleted)
  await db.delete(budgetMembers).where(eq(budgetMembers.id, memberId));

  return successResponse({ success: true });
});
