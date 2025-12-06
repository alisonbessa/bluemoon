import withAuthRequired from "@/lib/auth/withAuthRequired";
import { db } from "@/db";
import { groups, defaultGroups, budgetMembers } from "@/db/schema";
import { eq, or, isNull } from "drizzle-orm";
import { NextResponse } from "next/server";

// GET - Get all groups (with optional seeding)
// Returns: global groups (budgetId is null) + personal groups for user's budgets
export const GET = withAuthRequired(async (req, context) => {
  const { session } = context;
  const { searchParams } = new URL(req.url);
  const budgetId = searchParams.get("budgetId");

  // Check if global groups exist, seed if needed
  let globalGroups = await db
    .select()
    .from(groups)
    .where(isNull(groups.budgetId))
    .orderBy(groups.displayOrder);

  if (globalGroups.length === 0) {
    // Seed default groups
    await db.insert(groups).values(
      defaultGroups.map((g) => ({
        code: g.code,
        name: g.name,
        description: g.description,
        icon: g.icon,
        displayOrder: g.displayOrder,
      }))
    );
    globalGroups = await db
      .select()
      .from(groups)
      .where(isNull(groups.budgetId))
      .orderBy(groups.displayOrder);
  }

  // If budgetId is provided, also get personal groups for that budget
  if (budgetId) {
    // Verify user has access to this budget
    const membership = await db
      .select()
      .from(budgetMembers)
      .where(
        eq(budgetMembers.budgetId, budgetId)
      )
      .limit(1);

    if (membership.length > 0) {
      // Get personal groups for this budget
      const personalGroups = await db
        .select()
        .from(groups)
        .where(eq(groups.budgetId, budgetId))
        .orderBy(groups.displayOrder);

      // Combine global + personal groups, sorted by displayOrder
      const allGroups = [...globalGroups, ...personalGroups].sort(
        (a, b) => a.displayOrder - b.displayOrder
      );

      return NextResponse.json({ groups: allGroups });
    }
  }

  return NextResponse.json({ groups: globalGroups });
});
