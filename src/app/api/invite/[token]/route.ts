import { db } from "@/db";
import { invites, budgets, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

// GET - Get public invite info by token (no auth required)
export async function GET(
  request: Request,
  context: { params: Promise<{ token: string }> }
) {
  const { token } = await context.params;

  const [invite] = await db
    .select({
      id: invites.id,
      email: invites.email,
      name: invites.name,
      status: invites.status,
      expiresAt: invites.expiresAt,
      budgetId: invites.budgetId,
      budgetName: budgets.name,
      invitedByName: users.name,
      invitedByEmail: users.email,
    })
    .from(invites)
    .innerJoin(budgets, eq(invites.budgetId, budgets.id))
    .innerJoin(users, eq(invites.invitedByUserId, users.id))
    .where(eq(invites.token, token));

  if (!invite) {
    return NextResponse.json({ error: "Convite não encontrado" }, { status: 404 });
  }

  // Check if expired and update status if needed
  if (invite.status === "pending" && new Date() > invite.expiresAt) {
    await db
      .update(invites)
      .set({ status: "expired", updatedAt: new Date() })
      .where(eq(invites.id, invite.id));

    invite.status = "expired";
  }

  return NextResponse.json({
    invite: {
      id: invite.id,
      email: invite.email,
      name: invite.name,
      status: invite.status,
      expiresAt: invite.expiresAt,
      budget: {
        id: invite.budgetId,
        name: invite.budgetName,
      },
      invitedBy: {
        name: invite.invitedByName,
        email: invite.invitedByEmail,
      },
    },
  });
}
