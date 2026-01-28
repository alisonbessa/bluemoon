import withAuthRequired from "@/shared/lib/auth/withAuthRequired";
import { db } from "@/db";
import { invites, budgetMembers, budgets, users } from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { z } from "zod";
import {
  validationError,
  forbiddenError,
  successResponse,
  errorResponse,
} from "@/shared/lib/api/responses";
import sendMail from "@/shared/lib/email/sendMail";
import { render } from "@react-email/components";
import PartnerInviteEmail from "@/emails/PartnerInviteEmail";
import { appConfig } from "@/shared/lib/config";

const createInviteSchema = z.object({
  budgetId: z.string().uuid(),
  email: z.string().email().optional(),
  name: z.string().min(1).max(100).optional(),
});

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

// GET - Get invites for user's budgets
export const GET = withAuthRequired(async (req, context) => {
  const { session } = context;
  const { searchParams } = new URL(req.url);
  const budgetId = searchParams.get("budgetId");

  const ownerBudgetIds = await getOwnerBudgetIds(session.user.id);

  if (ownerBudgetIds.length === 0) {
    return successResponse({ invites: [] });
  }

  const budgetInvites = await db
    .select({
      invite: invites,
      budget: budgets,
    })
    .from(invites)
    .innerJoin(budgets, eq(invites.budgetId, budgets.id))
    .where(
      budgetId
        ? and(
            eq(invites.budgetId, budgetId),
            inArray(invites.budgetId, ownerBudgetIds)
          )
        : inArray(invites.budgetId, ownerBudgetIds)
    );

  return successResponse({
    invites: budgetInvites.map((i) => ({
      ...i.invite,
      budget: i.budget,
    })),
  });
});

// POST - Create a new invite
export const POST = withAuthRequired(async (req, context) => {
  const { session, getCurrentPlan } = context;
  const body = await req.json();

  const validation = createInviteSchema.safeParse(body);
  if (!validation.success) {
    return validationError(validation.error);
  }

  const { budgetId, email, name } = validation.data;

  // Check user is owner of the budget
  const ownerBudgetIds = await getOwnerBudgetIds(session.user.id);
  if (!ownerBudgetIds.includes(budgetId)) {
    return forbiddenError("Budget not found or you are not the owner");
  }

  // Get budget details for the email
  const [budget] = await db
    .select({ name: budgets.name })
    .from(budgets)
    .where(eq(budgets.id, budgetId))
    .limit(1);

  // Get inviter details
  const [inviter] = await db
    .select({ name: users.name })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  // Check if user's plan allows partners (Duo plan has maxBudgetMembers >= 2)
  const currentPlan = await getCurrentPlan();
  const maxMembers = currentPlan?.quotas?.maxBudgetMembers ?? 1;
  if (maxMembers < 2) {
    return errorResponse(
      "Faça upgrade para o plano Duo para convidar um parceiro",
      403
    );
  }

  // Check if there's already a connected partner (with userId)
  const existingPartner = await db
    .select()
    .from(budgetMembers)
    .where(
      and(
        eq(budgetMembers.budgetId, budgetId),
        eq(budgetMembers.type, "partner")
      )
    )
    .limit(1);

  // Only block if partner is actually connected (has userId)
  if (existingPartner.length > 0 && existingPartner[0].userId) {
    return errorResponse("This budget already has a connected partner", 400);
  }

  // Check if there's already a pending invite
  const existingInvite = await db
    .select()
    .from(invites)
    .where(
      and(
        eq(invites.budgetId, budgetId),
        eq(invites.status, "pending")
      )
    )
    .limit(1);

  if (existingInvite.length > 0) {
    return errorResponse("There is already a pending invite for this budget", 400);
  }

  // Generate a unique token
  const token = crypto.randomUUID();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // Expires in 7 days

  const [newInvite] = await db
    .insert(invites)
    .values({
      budgetId,
      invitedByUserId: session.user.id,
      email: email?.toLowerCase(),
      name,
      token,
      expiresAt,
    })
    .returning();

  const inviteLink = `${process.env.NEXT_PUBLIC_APP_URL}/invite/${token}`;

  // Send invite email if email was provided
  if (email) {
    try {
      const html = await render(
        PartnerInviteEmail({
          inviterName: inviter?.name || "Seu parceiro(a)",
          budgetName: budget?.name || "Orçamento Compartilhado",
          inviteUrl: inviteLink,
          expiresAt,
        })
      );

      await sendMail(
        email,
        `${inviter?.name || "Alguém"} te convidou para o ${appConfig.projectName}!`,
        html
      );
    } catch (error) {
      console.error("Failed to send invite email:", error);
      // Don't fail the request if email fails - invite was still created
    }
  }

  return successResponse({
    invite: newInvite,
    inviteLink,
    emailSent: !!email,
  }, 201);
});
