import withAuthRequired from "@/shared/lib/auth/withAuthRequired";
import { db } from "@/db";
import { invites, budgetMembers, users, plans } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { createPersonalGroupForMember } from "@/shared/lib/budget/personal-group";
import { z } from "zod";
import { capitalizeWords } from "@/shared/lib/utils";
import {
  validationError,
  notFoundError,
  forbiddenError,
  errorResponse,
  successResponse,
} from "@/shared/lib/api/responses";
import { recordAuditLog } from "@/shared/lib/security/audit-log";

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
    const [local, domain] = invite.email.split("@");
    const maskedLocal = local.length <= 2 ? `${local[0]}*` : `${local.slice(0, 2)}***`;
    const maskedInviteEmail = domain ? `${maskedLocal}@${domain}` : maskedLocal;
    return forbiddenError(
      `Este convite foi enviado para ${maskedInviteEmail}. Você está logado como ${user?.email ?? "outra conta"}. Faça login com a conta correta para aceitar.`
    );
  }

  // Check if owner's plan allows partners (Duo plan has maxBudgetMembers >= 2)
  const [owner] = await db
    .select({
      planId: users.planId,
      stripeSubscriptionId: users.stripeSubscriptionId,
    })
    .from(users)
    .where(eq(users.id, invite.invitedByUserId))
    .limit(1);

  // Check if the invited user already has an active Stripe subscription.
  // If so, preserve their plan to avoid orphaning the billing relationship.
  const [invitedUser] = await db
    .select({
      planId: users.planId,
      stripeSubscriptionId: users.stripeSubscriptionId,
    })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  const invitedUserHasActiveSubscription = Boolean(
    invitedUser?.stripeSubscriptionId
  );

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

  // Create partner membership.
  // onConflictDoNothing guards against duplicate insertions when two concurrent
  // accept requests race with the same token (requires UNIQUE (budget_id, user_id)).
  const memberName = capitalizeWords(user?.name || invite.name || "Partner");
  const [newMember] = await db
    .insert(budgetMembers)
    .values({
      budgetId: invite.budgetId,
      userId: session.user.id,
      name: memberName,
      type: "partner",
    })
    .onConflictDoNothing({
      target: [budgetMembers.budgetId, budgetMembers.userId],
    })
    .returning();

  if (!newMember) {
    return errorResponse("You are already a member of this budget", 400);
  }

  // Assign the owner's plan to the invited user so they share the same features.
  // Skip if the invited user already has an active Stripe subscription, otherwise
  // we'd orphan the Stripe relationship.
  if (!invitedUserHasActiveSubscription) {
    await db
      .update(users)
      .set({ planId: owner.planId })
      .where(eq(users.id, session.user.id));
  }

  // Create a personal group (and starter category) for the new partner
  await createPersonalGroupForMember(db, {
    budgetId: invite.budgetId,
    memberId: newMember.id,
    memberName: newMember.name,
  });

  // Update invite status
  await db
    .update(invites)
    .set({
      status: "accepted",
      acceptedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(invites.id, invite.id));

  await recordAuditLog({
    userId: session.user.id,
    action: "invite.accept",
    resource: "invite",
    resourceId: invite.id,
    details: {
      budgetId: invite.budgetId,
      memberId: newMember.id,
      invitedByUserId: invite.invitedByUserId,
    },
    req,
  });

  return successResponse({
    success: true,
    budgetId: invite.budgetId,
    member: newMember,
  });
});
