import withAuthRequired from "@/lib/auth/withAuthRequired";
import { db } from "@/db";
import { invites, budgetMembers } from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";

// Helper to get user's budget IDs (all types - owner, partner, etc.)
async function getUserBudgetIds(userId: string) {
  const memberships = await db
    .select({ budgetId: budgetMembers.budgetId })
    .from(budgetMembers)
    .where(eq(budgetMembers.userId, userId));
  return memberships.map((m) => m.budgetId);
}

// GET - Get a specific invite
export const GET = withAuthRequired(async (req, context) => {
  const { session } = context;
  const params = await context.params;
  const inviteId = params.id as string;

  const userBudgetIds = await getUserBudgetIds(session.user.id);
  if (userBudgetIds.length === 0) {
    return NextResponse.json({ error: "Convite não encontrado" }, { status: 404 });
  }

  const [invite] = await db
    .select()
    .from(invites)
    .where(
      and(eq(invites.id, inviteId), inArray(invites.budgetId, userBudgetIds))
    );

  if (!invite) {
    return NextResponse.json({ error: "Convite não encontrado" }, { status: 404 });
  }

  return NextResponse.json({ invite });
});

// DELETE - Cancel/revoke an invite
export const DELETE = withAuthRequired(async (req, context) => {
  const { session } = context;
  const params = await context.params;
  const inviteId = params.id as string;

  const userBudgetIds = await getUserBudgetIds(session.user.id);
  if (userBudgetIds.length === 0) {
    return NextResponse.json({ error: "Convite não encontrado" }, { status: 404 });
  }

  const [existingInvite] = await db
    .select()
    .from(invites)
    .where(
      and(eq(invites.id, inviteId), inArray(invites.budgetId, userBudgetIds))
    );

  if (!existingInvite) {
    return NextResponse.json({ error: "Convite não encontrado" }, { status: 404 });
  }

  if (existingInvite.status !== "pending") {
    return NextResponse.json(
      { error: "Só é possível cancelar convites pendentes" },
      { status: 400 }
    );
  }

  // Update status to cancelled
  await db
    .update(invites)
    .set({
      status: "cancelled",
      updatedAt: new Date(),
    })
    .where(eq(invites.id, inviteId));

  return NextResponse.json({ success: true });
});

// POST - Resend invite
export const POST = withAuthRequired(async (req, context) => {
  const { session } = context;
  const params = await context.params;
  const inviteId = params.id as string;

  const userBudgetIds = await getUserBudgetIds(session.user.id);
  if (userBudgetIds.length === 0) {
    return NextResponse.json({ error: "Convite não encontrado" }, { status: 404 });
  }

  const [existingInvite] = await db
    .select()
    .from(invites)
    .where(
      and(eq(invites.id, inviteId), inArray(invites.budgetId, userBudgetIds))
    );

  if (!existingInvite) {
    return NextResponse.json({ error: "Convite não encontrado" }, { status: 404 });
  }

  if (existingInvite.status !== "pending") {
    return NextResponse.json(
      { error: "Só é possível reenviar convites pendentes" },
      { status: 400 }
    );
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

  // TODO: Resend invite email via Inngest/Resend

  return NextResponse.json({
    invite: updatedInvite,
    inviteLink: `${process.env.NEXT_PUBLIC_APP_URL}/invite/${newToken}`,
  });
});
