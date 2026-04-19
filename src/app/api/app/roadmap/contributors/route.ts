import withAuthRequired from "@/shared/lib/auth/withAuthRequired";
import { db } from "@/db";
import { roadmapItems } from "@/db/schema/roadmap";
import { users } from "@/db/schema/user";
import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { forbiddenError, successResponse } from "@/shared/lib/api/responses";
import { canAccessBetaLab } from "@/features/roadmap/constants";

export const GET = withAuthRequired(async (_req, context) => {
  const user = await context.getUser();
  if (!canAccessBetaLab(user?.role)) return forbiddenError("Área restrita");

  // Top contributors by count of implemented + planned + in_progress items they proposed
  // Only non-anonymous suggestions count.
  const rows = await db
    .select({
      userId: users.id,
      name: users.displayName,
      image: users.image,
      suggestions: sql<number>`count(${roadmapItems.id})::int`,
      implemented: sql<number>`sum(case when ${roadmapItems.status} = 'implemented' then 1 else 0 end)::int`,
      totalUpvotes: sql<number>`coalesce(sum(${roadmapItems.upvotes}), 0)::int`,
    })
    .from(roadmapItems)
    .innerJoin(users, eq(roadmapItems.userId, users.id))
    .where(
      and(
        eq(roadmapItems.source, "user"),
        eq(roadmapItems.isAnonymous, false),
        isNull(roadmapItems.mergedIntoId)
      )
    )
    .groupBy(users.id, users.displayName, users.image)
    .orderBy(
      desc(sql`sum(case when ${roadmapItems.status} = 'implemented' then 1 else 0 end)`),
      desc(sql`coalesce(sum(${roadmapItems.upvotes}), 0)`),
      desc(sql`count(${roadmapItems.id})`)
    )
    .limit(10);

  return successResponse({ contributors: rows });
});
