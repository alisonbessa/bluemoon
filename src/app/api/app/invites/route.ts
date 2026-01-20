import withAuthRequired from "@/shared/lib/auth/withAuthRequired";
import { db } from "@/db";
import { invites, budgetMembers, budgets, groups, categories } from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

const createInviteSchema = z.object({
  budgetId: z.string().uuid(),
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
    return NextResponse.json({ invites: [] });
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

  return NextResponse.json({
    invites: budgetInvites.map((i) => ({
      ...i.invite,
      budget: i.budget,
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

  const { budgetId } = validation.data;

  // Check user is owner of the budget
  const ownerBudgetIds = await getOwnerBudgetIds(session.user.id);
  if (!ownerBudgetIds.includes(budgetId)) {
    return NextResponse.json(
      { error: "Budget not found or you are not the owner" },
      { status: 404 }
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
    return NextResponse.json(
      { error: "This budget already has a connected partner" },
      { status: 400 }
    );
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
    return NextResponse.json(
      { error: "There is already a pending invite for this budget" },
      { status: 400 }
    );
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
      token,
      expiresAt,
    })
    .returning();

  // TODO: Send invite email via Inngest/Resend

  return NextResponse.json(
    {
      invite: newInvite,
      inviteLink: `${process.env.NEXT_PUBLIC_APP_URL}/invite/${token}`,
    },
    { status: 201 }
  );
});
