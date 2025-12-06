import withAuthRequired from "@/lib/auth/withAuthRequired";
import { db } from "@/db";
import { invites, budgetMembers, budgets, users } from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

const createInviteSchema = z.object({
  budgetId: z.string().uuid(),
  email: z.string().email().optional(), // Optional - for link-based invites
  name: z.string().min(1).max(100).optional(),
});

// Helper to get user's membership in budgets
async function getUserMemberships(userId: string) {
  const memberships = await db
    .select({
      memberId: budgetMembers.id,
      budgetId: budgetMembers.budgetId,
      type: budgetMembers.type,
    })
    .from(budgetMembers)
    .where(eq(budgetMembers.userId, userId));
  return memberships;
}

// Helper to get user's budget IDs (all types - owner, partner, etc.)
async function getUserBudgetIds(userId: string) {
  const memberships = await getUserMemberships(userId);
  return memberships.map((m) => m.budgetId);
}

// GET - Get invites for user's budgets
export const GET = withAuthRequired(async (req, context) => {
  const { session } = context;
  const { searchParams } = new URL(req.url);
  const budgetId = searchParams.get("budgetId");

  const userBudgetIds = await getUserBudgetIds(session.user.id);

  if (userBudgetIds.length === 0) {
    return NextResponse.json({ invites: [] });
  }

  const budgetInvites = await db
    .select({
      invite: invites,
      budget: budgets,
      invitedByUser: {
        id: users.id,
        name: users.name,
        email: users.email,
      },
    })
    .from(invites)
    .innerJoin(budgets, eq(invites.budgetId, budgets.id))
    .leftJoin(users, eq(invites.invitedByUserId, users.id))
    .where(
      budgetId
        ? and(
            eq(invites.budgetId, budgetId),
            inArray(invites.budgetId, userBudgetIds)
          )
        : inArray(invites.budgetId, userBudgetIds)
    )
    .orderBy(invites.createdAt);

  return NextResponse.json({
    invites: budgetInvites.map((i) => ({
      ...i.invite,
      budget: i.budget,
      invitedBy: i.invitedByUser,
    })),
  });
});

// POST - Create a new invite
export const POST = withAuthRequired(async (req, context) => {
  const { session } = context;
  const body = await req.json();

  const validation = createInviteSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(
      { error: "Validation failed", details: validation.error.errors },
      { status: 400 }
    );
  }

  const { budgetId, email, name } = validation.data;

  // Check user is a member of the budget (any type can invite)
  const memberships = await getUserMemberships(session.user.id);
  const membership = memberships.find((m) => m.budgetId === budgetId);

  if (!membership) {
    return NextResponse.json(
      { error: "Budget not found or you are not a member" },
      { status: 404 }
    );
  }

  // If email is provided, check if there's already a pending invite for this email
  if (email) {
    const existingInvite = await db
      .select()
      .from(invites)
      .where(
        and(
          eq(invites.budgetId, budgetId),
          eq(invites.email, email.toLowerCase()),
          eq(invites.status, "pending")
        )
      )
      .limit(1);

    if (existingInvite.length > 0) {
      return NextResponse.json(
        { error: "Já existe um convite pendente para este email" },
        { status: 400 }
      );
    }

    // Check if someone with this email is already a member
    const existingMember = await db
      .select({ id: budgetMembers.id })
      .from(budgetMembers)
      .innerJoin(users, eq(budgetMembers.userId, users.id))
      .where(
        and(
          eq(budgetMembers.budgetId, budgetId),
          eq(users.email, email.toLowerCase())
        )
      )
      .limit(1);

    if (existingMember.length > 0) {
      return NextResponse.json(
        { error: "Este email já pertence a um membro do orçamento" },
        { status: 400 }
      );
    }
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
      invitedByMemberId: membership.memberId,
      email: email?.toLowerCase(),
      name,
      token,
      expiresAt,
    })
    .returning();

  const inviteLink = `${process.env.NEXT_PUBLIC_APP_URL}/invite/${token}`;

  // TODO: Send invite email via Inngest/Resend if email is provided

  return NextResponse.json(
    {
      invite: newInvite,
      inviteLink,
    },
    { status: 201 }
  );
});
