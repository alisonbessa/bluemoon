import withAuthRequired from "@/shared/lib/auth/withAuthRequired";
import { db } from "@/db";
import { groups, budgetMembers, budgets, defaultGroups } from "@/db/schema";
import { eq, and, isNull, isNotNull, inArray } from "drizzle-orm";
import { getUserBudgetIds, getUserMemberIdInBudget } from "@/shared/lib/api/permissions";
import { successResponse } from "@/shared/lib/api/responses";

// GET - Get groups: global ones + personal groups for the user's budget(s)
// Optional ?budgetId= to scope to a specific budget
// Personal groups are filtered by privacy mode: in "private" mode, only the
// requesting member's own personal group is returned.
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
          inArray(budgetMembers.budgetId, targetBudgetIds)
        )
      )
      .orderBy(groups.displayOrder);

    // Apply privacy filtering: in "private" mode each member only sees their own group
    const budgetPrivacies = await db
      .select({ id: budgets.id, privacyMode: budgets.privacyMode })
      .from(budgets)
      .where(inArray(budgets.id, targetBudgetIds));

    const privacyMap = new Map(budgetPrivacies.map((b) => [b.id, b.privacyMode]));

    // Pre-resolve member IDs for private budgets (avoids N+1)
    const privateBudgetIds = budgetPrivacies
      .filter((b) => b.privacyMode === "private")
      .map((b) => b.id);

    const memberIdMap = new Map<string, string | null>();
    for (const budId of privateBudgetIds) {
      memberIdMap.set(budId, await getUserMemberIdInBudget(session.user.id, budId));
    }

    const visibleGroupIds = new Set<string>();
    for (const { group } of rows) {
      const budId = group.budgetId!;
      if (privacyMap.get(budId) === "private") {
        if (group.memberId === memberIdMap.get(budId)) {
          visibleGroupIds.add(group.id);
        }
      } else {
        visibleGroupIds.add(group.id);
      }
    }

    personalGroups = rows.filter((r) => visibleGroupIds.has(r.group.id)).map((r) => r.group);
  }

  const allGroups = [...globalGroups, ...personalGroups].sort(
    (a, b) => a.displayOrder - b.displayOrder
  );

  return successResponse({ groups: allGroups });
});
