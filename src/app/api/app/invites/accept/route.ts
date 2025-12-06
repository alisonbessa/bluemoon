import withAuthRequired from "@/lib/auth/withAuthRequired";
import { db } from "@/db";
import { invites, budgetMembers, groups, categories, users } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { capitalizeWords } from "@/lib/utils";

const acceptInviteSchema = z.object({
  token: z.string().uuid(),
});

// POST - Accept an invite
export const POST = withAuthRequired(async (req, context) => {
  const { session, getUser } = context;
  const body = await req.json();

  const validation = acceptInviteSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(
      { error: "Validation failed", details: validation.error.errors },
      { status: 400 }
    );
  }

  const { token } = validation.data;

  // Find the invite
  const [invite] = await db
    .select()
    .from(invites)
    .where(and(eq(invites.token, token), eq(invites.status, "pending")));

  if (!invite) {
    return NextResponse.json(
      { error: "Convite inválido ou expirado", code: "INVITE_NOT_FOUND" },
      { status: 404 }
    );
  }

  // Check if expired
  if (new Date() > invite.expiresAt) {
    await db
      .update(invites)
      .set({ status: "expired", updatedAt: new Date() })
      .where(eq(invites.id, invite.id));

    return NextResponse.json(
      { error: "Este convite expirou", code: "INVITE_EXPIRED" },
      { status: 400 }
    );
  }

  // If invite has a specific email, check if user's email matches
  const user = await getUser();
  if (invite.email && user?.email?.toLowerCase() !== invite.email.toLowerCase()) {
    return NextResponse.json(
      {
        error: "Este convite foi enviado para outro email",
        inviteEmail: invite.email,
        code: "EMAIL_MISMATCH",
      },
      { status: 403 }
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
    return NextResponse.json(
      { error: "Você já é membro deste orçamento", code: "ALREADY_MEMBER" },
      { status: 400 }
    );
  }

  // Create partner membership
  const memberName = capitalizeWords(user?.name || invite.name || "Parceiro");
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
      acceptedByUserId: session.user.id,
      updatedAt: new Date(),
    })
    .where(eq(invites.id, invite.id));

  // Update user's lastBudgetId to the newly joined budget
  await db
    .update(users)
    .set({ lastBudgetId: invite.budgetId })
    .where(eq(users.id, session.user.id));

  // TODO: Send notification email to the inviter

  return NextResponse.json({
    success: true,
    budgetId: invite.budgetId,
    member: newMember,
  });
});
