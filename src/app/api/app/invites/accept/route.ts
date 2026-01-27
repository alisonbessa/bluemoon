import withAuthRequired from "@/shared/lib/auth/withAuthRequired";
import { db } from "@/db";
import { invites, budgetMembers, groups, categories, users, plans } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { capitalizeWords } from "@/shared/lib/utils";
import {
  validationError,
  notFoundError,
  forbiddenError,
  errorResponse,
  successResponse,
} from "@/shared/lib/api/responses";

const acceptInviteSchema = z.object({
  token: z.string().uuid(),
});

// POST - Accept an invite
export const POST = withAuthRequired(async (req, context) => {
  const { session, getUser } = context;
  const body = await req.json();

  const validation = acceptInviteSchema.safeParse(body);
  if (!validation.success) {
    return validationError(validation.error);
  }

  const { token } = validation.data;

  // Find the invite
  const [invite] = await db
    .select()
    .from(invites)
    .where(and(eq(invites.token, token), eq(invites.status, "pending")));

  if (!invite) {
    return notFoundError("Invite");
  }

  // Check if expired
  if (new Date() > invite.expiresAt) {
    await db
      .update(invites)
      .set({ status: "expired", updatedAt: new Date() })
      .where(eq(invites.id, invite.id));

    return errorResponse("Invite has expired", 400);
  }

  // Get user data
  const user = await getUser();

  // If invite has a specific email, check if user's email matches
  if (invite.email && user?.email?.toLowerCase() !== invite.email.toLowerCase()) {
    return forbiddenError("This invite was sent to a different email address");
  }

  // Check if owner's plan allows partners (Duo plan has maxBudgetMembers >= 2)
  const [owner] = await db
    .select({
      planId: users.planId,
    })
    .from(users)
    .where(eq(users.id, invite.invitedByUserId))
    .limit(1);

  if (owner?.planId) {
    const [ownerPlan] = await db
      .select({
        quotas: plans.quotas,
      })
      .from(plans)
      .where(eq(plans.id, owner.planId))
      .limit(1);

    const maxMembers = ownerPlan?.quotas?.maxBudgetMembers ?? 1;
    if (maxMembers < 2) {
      return errorResponse(
        "O plano do dono do orçamento não permite parceiros. Peça para fazer upgrade para o plano Duo.",
        403
      );
    }
  } else {
    // Owner doesn't have a plan assigned, block partner acceptance
    return errorResponse(
      "O dono do orçamento não possui um plano ativo. Peça para assinar um plano.",
      403
    );
  }

  // Check if user is already a member of this budget
  const existingMembership = await db
    .select()
    .from(budgetMembers)
    .where(
      and(
        eq(budgetMembers.budgetId, invite.budgetId),
        eq(budgetMembers.userId, session.user.id)
      )
    )
    .limit(1);

  if (existingMembership.length > 0) {
    return errorResponse("You are already a member of this budget", 400);
  }

  // Create partner membership
  const memberName = capitalizeWords(user?.name || invite.name || "Partner");
  const [newMember] = await db
    .insert(budgetMembers)
    .values({
      budgetId: invite.budgetId,
      userId: session.user.id,
      name: memberName,
      type: "partner",
    })
    .returning();

  // Create a "Prazeres" category for the new partner
  const pleasuresGroup = await db
    .select()
    .from(groups)
    .where(eq(groups.code, "pleasures"))
    .limit(1);

  if (pleasuresGroup.length > 0) {
    await db.insert(categories).values({
      budgetId: invite.budgetId,
      groupId: pleasuresGroup[0].id,
      memberId: newMember.id,
      name: `Prazeres - ${newMember.name}`,
      icon: "🎉",
      behavior: "refill_up",
      plannedAmount: 0,
    });
  }

  // Update invite status
  await db
    .update(invites)
    .set({
      status: "accepted",
      acceptedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(invites.id, invite.id));

  return successResponse({
    success: true,
    budgetId: invite.budgetId,
    member: newMember,
  });
});
