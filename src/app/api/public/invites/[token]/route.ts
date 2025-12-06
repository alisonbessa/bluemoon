import { db } from "@/db";
import { invites, budgets, users, budgetMembers } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

// GET - Validate invite token and return budget info (public endpoint)
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  if (!token) {
    return NextResponse.json(
      { error: "Token is required" },
      { status: 400 }
    );
  }

  // Find the invite with related data
  const [invite] = await db
    .select({
      id: invites.id,
      budgetId: invites.budgetId,
      email: invites.email,
      name: invites.name,
      status: invites.status,
      expiresAt: invites.expiresAt,
      createdAt: invites.createdAt,
      budgetName: budgets.name,
      budgetCurrency: budgets.currency,
      invitedByUserId: invites.invitedByUserId,
    })
    .from(invites)
    .innerJoin(budgets, eq(invites.budgetId, budgets.id))
    .where(eq(invites.token, token));

  if (!invite) {
    return NextResponse.json(
      { error: "Invite not found", code: "INVITE_NOT_FOUND" },
      { status: 404 }
    );
  }

  // Check if expired by date
  if (new Date() > invite.expiresAt) {
    // Update status to expired if not already
    if (invite.status === "pending") {
      await db
        .update(invites)
        .set({ status: "expired", updatedAt: new Date() })
        .where(eq(invites.id, invite.id));
    }

    return NextResponse.json(
      { error: "Invite has expired", code: "INVITE_EXPIRED" },
      { status: 410 }
    );
  }

  // Check status
  if (invite.status !== "pending") {
    const errorMessages: Record<string, string> = {
      accepted: "This invite has already been used",
      expired: "This invite has expired",
      cancelled: "This invite has been cancelled",
    };

    return NextResponse.json(
      {
        error: errorMessages[invite.status] || "Invite is not valid",
        code: `INVITE_${invite.status.toUpperCase()}`,
      },
      { status: 410 }
    );
  }

  // Get inviter info
  const [inviter] = await db
    .select({
      name: users.name,
      email: users.email,
      image: users.image,
    })
    .from(users)
    .where(eq(users.id, invite.invitedByUserId));

  // Get current member count
  const memberCount = await db
    .select({ id: budgetMembers.id })
    .from(budgetMembers)
    .where(eq(budgetMembers.budgetId, invite.budgetId))
    .then((members) => members.length);

  return NextResponse.json({
    valid: true,
    invite: {
      id: invite.id,
      email: invite.email,
      name: invite.name,
      expiresAt: invite.expiresAt,
    },
    budget: {
      id: invite.budgetId,
      name: invite.budgetName,
      currency: invite.budgetCurrency,
      memberCount,
    },
    invitedBy: inviter ? {
      name: inviter.name,
      email: inviter.email,
      image: inviter.image,
    } : null,
  });
}
