import { Metadata } from "next";
import { appConfig } from "@/lib/config";
import { auth } from "@/auth";
import { db } from "@/db";
import { invites, budgets, users, budgetMembers } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { InviteAcceptClient } from "./invite-accept-client";

interface InvitePageProps {
  params: Promise<{ token: string }>;
}

export async function generateMetadata({ params }: InvitePageProps): Promise<Metadata> {
  const { token } = await params;

  // Fetch invite data for metadata
  const [invite] = await db
    .select({
      budgetName: budgets.name,
    })
    .from(invites)
    .innerJoin(budgets, eq(invites.budgetId, budgets.id))
    .where(eq(invites.token, token));

  if (!invite) {
    return {
      title: "Convite inválido",
      description: "Este convite não é válido ou expirou",
    };
  }

  return {
    title: `Convite para ${invite.budgetName}`,
    description: `Você foi convidado para participar do orçamento "${invite.budgetName}" no ${appConfig.projectName}`,
  };
}

async function getInviteData(token: string) {
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
    return { error: "INVITE_NOT_FOUND" as const };
  }

  // Check if expired by date
  if (new Date() > invite.expiresAt && invite.status === "pending") {
    await db
      .update(invites)
      .set({ status: "expired", updatedAt: new Date() })
      .where(eq(invites.id, invite.id));
    return { error: "INVITE_EXPIRED" as const };
  }

  // Check status
  if (invite.status !== "pending") {
    return { error: `INVITE_${invite.status.toUpperCase()}` as const };
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

  // Get current members
  const members = await db
    .select({ id: budgetMembers.id, name: budgetMembers.name })
    .from(budgetMembers)
    .where(eq(budgetMembers.budgetId, invite.budgetId));

  return {
    invite: {
      id: invite.id,
      email: invite.email,
      name: invite.name,
      expiresAt: invite.expiresAt.toISOString(),
    },
    budget: {
      id: invite.budgetId,
      name: invite.budgetName,
      currency: invite.budgetCurrency,
      memberCount: members.length,
      memberNames: members.map((m) => m.name),
    },
    invitedBy: inviter
      ? {
          name: inviter.name,
          email: inviter.email,
          image: inviter.image,
        }
      : null,
  };
}

export default async function InvitePage({ params }: InvitePageProps) {
  const { token } = await params;

  // Get current session
  const session = await auth();
  const isLoggedIn = !!session?.user?.id;

  // Get invite data
  const inviteData = await getInviteData(token);

  // If invite has an error, show error state
  if ("error" in inviteData) {
    return (
      <InviteAcceptClient
        token={token}
        error={inviteData.error}
        isLoggedIn={isLoggedIn}
        currentUserEmail={session?.user?.email}
      />
    );
  }

  // If user is logged in, check if they can accept this invite
  let canAccept = true;
  let emailMismatch = false;
  let alreadyMember = false;

  if (isLoggedIn && session?.user?.id) {
    // Check if the logged-in user's email matches the invite email (if specified)
    if (inviteData.invite.email) {
      emailMismatch = session.user.email?.toLowerCase() !== inviteData.invite.email.toLowerCase();
      canAccept = !emailMismatch;
    }

    // Check if user is already a member of this budget
    const existingMembership = await db
      .select({ id: budgetMembers.id })
      .from(budgetMembers)
      .where(
        and(
          eq(budgetMembers.budgetId, inviteData.budget.id),
          eq(budgetMembers.userId, session.user.id)
        )
      )
      .limit(1);

    alreadyMember = existingMembership.length > 0;
    if (alreadyMember) {
      canAccept = false;
    }
  }

  return (
    <InviteAcceptClient
      token={token}
      invite={inviteData.invite}
      budget={inviteData.budget}
      invitedBy={inviteData.invitedBy}
      isLoggedIn={isLoggedIn}
      canAccept={canAccept}
      emailMismatch={emailMismatch}
      alreadyMember={alreadyMember}
      currentUserEmail={session?.user?.email}
    />
  );
}
