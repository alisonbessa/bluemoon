import withAuthRequired from "@/shared/lib/auth/withAuthRequired";
import { createLogger } from "@/shared/lib/logger";
import { db } from "@/db";

const logger = createLogger("api:invites:detail");
import { invites, budgetMembers, budgets, users } from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import {
  notFoundError,
  errorResponse,
  successResponse,
} from "@/shared/lib/api/responses";
import sendMail from "@/shared/lib/email/sendMail";
import { render } from "@react-email/components";
import PartnerInviteEmail from "@/emails/PartnerInviteEmail";
import { appConfig } from "@/shared/lib/config";

// Helper to get user's budget IDs where they are owner
async function getOwnerBudgetIds(userId: string) {
  const memberships = await db
    .select({ budgetId: budgetMembers.budgetId })
    .from(budgetMembers)
    .where(
      and(eq(budgetMembers.userId, userId), eq(budgetMembers.type, "owner"))
    );
  return memberships.map((m) => m.budgetId);
}

// GET - Get a specific invite
export const GET = withAuthRequired(async (req, context) => {
  const { session } = context;
  const params = await context.params;
  const inviteId = params.id as string;

  const ownerBudgetIds = await getOwnerBudgetIds(session.user.id);
  if (ownerBudgetIds.length === 0) {
    return notFoundError("Invite");
  }

  const [invite] = await db
    .select()
    .from(invites)
    .where(
      and(eq(invites.id, inviteId), inArray(invites.budgetId, ownerBudgetIds))
    );

  if (!invite) {
    return notFoundError("Invite");
  }

  return successResponse({ invite });
});

// DELETE - Cancel/revoke an invite
export const DELETE = withAuthRequired(async (req, context) => {
  const { session } = context;
  const params = await context.params;
  const inviteId = params.id as string;

  const ownerBudgetIds = await getOwnerBudgetIds(session.user.id);
  if (ownerBudgetIds.length === 0) {
    return notFoundError("Invite");
  }

  const [existingInvite] = await db
    .select()
    .from(invites)
    .where(
      and(eq(invites.id, inviteId), inArray(invites.budgetId, ownerBudgetIds))
    );

  if (!existingInvite) {
    return notFoundError("Invite");
  }

  if (existingInvite.status !== "pending") {
    return errorResponse("Can only cancel pending invites", 400);
  }

  // Update status to cancelled
  await db
    .update(invites)
    .set({
      status: "cancelled",
      updatedAt: new Date(),
    })
    .where(eq(invites.id, inviteId));

  return successResponse({ success: true });
});

// POST - Resend invite
export const POST = withAuthRequired(async (req, context) => {
  const { session } = context;
  const params = await context.params;
  const inviteId = params.id as string;

  const ownerBudgetIds = await getOwnerBudgetIds(session.user.id);
  if (ownerBudgetIds.length === 0) {
    return notFoundError("Invite");
  }

  const [existingInvite] = await db
    .select()
    .from(invites)
    .where(
      and(eq(invites.id, inviteId), inArray(invites.budgetId, ownerBudgetIds))
    );

  if (!existingInvite) {
    return notFoundError("Invite");
  }

  if (existingInvite.status !== "pending") {
    return errorResponse("Can only resend pending invites", 400);
  }

  // Generate new token and extend expiration
  const newToken = crypto.randomUUID();
  const newExpiresAt = new Date();
  newExpiresAt.setDate(newExpiresAt.getDate() + 7);

  const [updatedInvite] = await db
    .update(invites)
    .set({
      token: newToken,
      expiresAt: newExpiresAt,
      updatedAt: new Date(),
    })
    .where(eq(invites.id, inviteId))
    .returning();

  const inviteLink = `${process.env.NEXT_PUBLIC_APP_URL}/invite/${newToken}`;

  // Send email if the invite has an email address
  if (existingInvite.email) {
    try {
      // Get budget and inviter details for the email
      const [budget] = await db
        .select({ name: budgets.name })
        .from(budgets)
        .where(eq(budgets.id, existingInvite.budgetId))
        .limit(1);

      const [inviter] = await db
        .select({ name: users.name })
        .from(users)
        .where(eq(users.id, session.user.id))
        .limit(1);

      const html = await render(
        PartnerInviteEmail({
          inviterName: inviter?.name || "Seu parceiro(a)",
          budgetName: budget?.name || "Orçamento Compartilhado",
          inviteUrl: inviteLink,
          expiresAt: newExpiresAt,
        })
      );

      await sendMail(
        existingInvite.email,
        `${inviter?.name || "Alguém"} te convidou para o ${appConfig.projectName}!`,
        html
      );
    } catch (error) {
      logger.error("Failed to resend invite email:", error);
    }
  }

  return successResponse({
    invite: updatedInvite,
    inviteLink,
    emailSent: !!existingInvite.email,
  });
});
