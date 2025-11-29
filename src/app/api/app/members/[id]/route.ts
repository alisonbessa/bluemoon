import withAuthRequired from "@/lib/auth/withAuthRequired";
import { db } from "@/db";
import { budgetMembers, categories } from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { capitalizeWords } from "@/lib/utils";

const updateMemberSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  color: z.string().optional(),
  monthlyPleasureBudget: z.number().int().min(0).optional(),
});

// Helper to get user's budget IDs where they are owner/partner
async function getUserBudgetMemberships(userId: string) {
  const memberships = await db
    .select({ budgetId: budgetMembers.budgetId, type: budgetMembers.type })
    .from(budgetMembers)
    .where(eq(budgetMembers.userId, userId));
  return memberships;
}

// GET - Get a specific member
export const GET = withAuthRequired(async (req, context) => {
  const { session } = context;
  const params = await context.params;
  const memberId = params.id as string;

  const memberships = await getUserBudgetMemberships(session.user.id);
  const budgetIds = memberships.map((m) => m.budgetId);

  if (budgetIds.length === 0) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }

  const [member] = await db
    .select()
    .from(budgetMembers)
    .where(
      and(
        eq(budgetMembers.id, memberId),
        inArray(budgetMembers.budgetId, budgetIds)
      )
    );

  if (!member) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }

  return NextResponse.json({ member });
});

// PATCH - Update a member
export const PATCH = withAuthRequired(async (req, context) => {
  const { session } = context;
  const params = await context.params;
  const memberId = params.id as string;
  const body = await req.json();

  const memberships = await getUserBudgetMemberships(session.user.id);
  const budgetIds = memberships.map((m) => m.budgetId);

  if (budgetIds.length === 0) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }

  const [existingMember] = await db
    .select()
    .from(budgetMembers)
    .where(
      and(
        eq(budgetMembers.id, memberId),
        inArray(budgetMembers.budgetId, budgetIds)
      )
    );

  if (!existingMember) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }

  // Check user is owner or partner
  const membership = memberships.find((m) => m.budgetId === existingMember.budgetId);
  if (!membership || (membership.type !== "owner" && membership.type !== "partner")) {
    return NextResponse.json(
      { error: "Only owner or partner can update members" },
      { status: 403 }
    );
  }

  // Can't update owner/partner members (they update themselves via profile)
  if (existingMember.type === "owner" || existingMember.type === "partner") {
    return NextResponse.json(
      { error: "Cannot update owner or partner through this endpoint" },
      { status: 403 }
    );
  }

  const validation = updateMemberSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(
      { error: "Validation failed", details: validation.error.errors },
      { status: 400 }
    );
  }

  const capitalizedName = validation.data.name ? capitalizeWords(validation.data.name) : undefined;

  const [updatedMember] = await db
    .update(budgetMembers)
    .set({
      ...validation.data,
      ...(capitalizedName && { name: capitalizedName }),
      updatedAt: new Date(),
    })
    .where(eq(budgetMembers.id, memberId))
    .returning();

  // Update the related "Prazeres" category if monthlyPleasureBudget changed
  if (validation.data.monthlyPleasureBudget !== undefined) {
    await db
      .update(categories)
      .set({
        plannedAmount: validation.data.monthlyPleasureBudget,
        updatedAt: new Date(),
      })
      .where(eq(categories.memberId, memberId));
  }

  // Update category name if member name changed
  if (capitalizedName) {
    await db
      .update(categories)
      .set({
        name: `Prazeres - ${capitalizedName}`,
        updatedAt: new Date(),
      })
      .where(eq(categories.memberId, memberId));
  }

  return NextResponse.json({ member: updatedMember });
});

// DELETE - Remove a dependent member
export const DELETE = withAuthRequired(async (req, context) => {
  const { session } = context;
  const params = await context.params;
  const memberId = params.id as string;

  const memberships = await getUserBudgetMemberships(session.user.id);
  const budgetIds = memberships.map((m) => m.budgetId);

  if (budgetIds.length === 0) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }

  const [existingMember] = await db
    .select()
    .from(budgetMembers)
    .where(
      and(
        eq(budgetMembers.id, memberId),
        inArray(budgetMembers.budgetId, budgetIds)
      )
    );

  if (!existingMember) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }

  // Check user is owner
  const membership = memberships.find((m) => m.budgetId === existingMember.budgetId);
  if (!membership || membership.type !== "owner") {
    return NextResponse.json(
      { error: "Only owner can remove members" },
      { status: 403 }
    );
  }

  // Can't delete owner
  if (existingMember.type === "owner") {
    return NextResponse.json(
      { error: "Cannot remove the budget owner" },
      { status: 403 }
    );
  }

  // Delete the member (categories will be cascade deleted)
  await db.delete(budgetMembers).where(eq(budgetMembers.id, memberId));

  return NextResponse.json({ success: true });
});
