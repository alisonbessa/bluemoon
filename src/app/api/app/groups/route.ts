import withAuthRequired from "@/shared/lib/auth/withAuthRequired";
import { db } from "@/db";
import { groups, budgetMembers, defaultGroups } from "@/db/schema";
import { eq, and, isNull, isNotNull } from "drizzle-orm";
import { getUserBudgetIds } from "@/shared/lib/api/permissions";
import { successResponse } from "@/shared/lib/api/responses";

// GET - Get groups: global ones + personal groups for the user's budget(s)
// Optional ?budgetId= to scope to a specific budget
export const GET = withAuthRequired(async (req, context) => {
  const { session } = context;
  const { searchParams } = new URL(req.url);
  const budgetId = searchParams.get("budgetId");

  // Ensure global groups are seeded
  let globalGroups = await db
    .select()
    .from(groups)
    .where(isNull(groups.budgetId))
    .orderBy(groups.displayOrder);

  if (globalGroups.length === 0) {
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

  // Fetch personal groups for the user's budgets
  const budgetIds = await getUserBudgetIds(session.user.id);
  const targetBudgetIds = budgetId && budgetIds.includes(budgetId) ? [budgetId] : budgetIds;

  let personalGroups: typeof groups.$inferSelect[] = [];

  if (targetBudgetIds.length > 0) {
    const rows = await db
      .select({ group: groups })
      .from(groups)
      .innerJoin(budgetMembers, eq(groups.memberId, budgetMembers.id))
      .where(
        and(
          isNotNull(groups.memberId),
          eq(budgetMembers.budgetId, targetBudgetIds[0])
        )
      )
      .orderBy(groups.displayOrder);

    personalGroups = rows.map((r) => r.group);
  }

  const allGroups = [...globalGroups, ...personalGroups].sort(
    (a, b) => a.displayOrder - b.displayOrder
  );

  return successResponse({ groups: allGroups });
});
