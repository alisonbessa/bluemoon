import { db } from "@/db";
import { groups, categories } from "@/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { getFirstName } from "@/shared/lib/utils";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
type DbOrTx = typeof db | Tx;

/**
 * Create a personal group for a budget member.
 * Also creates a default starter category inside it.
 * Safe to call multiple times — returns the existing group if it already exists.
 */
export async function createPersonalGroupForMember(
  dbOrTx: DbOrTx,
  {
    budgetId,
    memberId,
    memberName,
    displayOrder = 10,
  }: {
    budgetId: string;
    memberId: string;
    memberName: string;
    displayOrder?: number;
  }
): Promise<{ groupId: string }> {
  const firstName = getFirstName(memberName) ?? memberName;

  // Idempotent: return existing group if already created FOR THIS BUDGET+MEMBER pair
  const [existing] = await dbOrTx
    .select({ id: groups.id })
    .from(groups)
    .where(and(eq(groups.budgetId, budgetId), eq(groups.memberId, memberId)))
    .limit(1);

  if (existing) {
    return { groupId: existing.id };
  }

  const [newGroup] = await dbOrTx
    .insert(groups)
    .values({
      budgetId,
      memberId,
      code: null,
      name: `Gastos de ${firstName}`,
      description: `Gastos pessoais de ${firstName}`,
      icon: "✨",
      displayOrder,
    })
    .returning({ id: groups.id });

  // Seed a default category inside the personal group
  await dbOrTx.insert(categories).values({
    budgetId,
    groupId: newGroup.id,
    memberId,
    name: `Gastos de ${firstName}`,
    icon: "✨",
    behavior: "refill_up",
    plannedAmount: 0,
  });

  return { groupId: newGroup.id };
}

/**
 * Fetch global groups and return a code→group map.
 * Use this instead of selecting all groups (which now includes personal ones).
 */
export async function getGlobalGroupsByCode(
  dbOrTx: DbOrTx
): Promise<Record<string, { id: string; code: string | null; name: string }>> {
  const globalGroups = await dbOrTx
    .select()
    .from(groups)
    .where(isNull(groups.budgetId));

  return Object.fromEntries(
    globalGroups
      .filter((g) => g.code != null)
      .map((g) => [g.code!, g])
  );
}
