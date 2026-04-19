import withAuthRequired from "@/shared/lib/auth/withAuthRequired";
import { db } from "@/db";
import { users } from "@/db/schema/user";
import { roadmapItems } from "@/db/schema/roadmap";
import { and, eq, gt, isNull, sql } from "drizzle-orm";
import { forbiddenError, successResponse } from "@/shared/lib/api/responses";
import { canAccessBetaLab } from "@/features/roadmap/constants";

export const GET = withAuthRequired(async (_req, context) => {
  const user = await context.getUser();
  if (!canAccessBetaLab(user?.role)) return forbiddenError("Área restrita");

  const [userRow] = await db
    .select({ lastSeenRoadmapAt: users.lastSeenRoadmapAt })
    .from(users)
    .where(eq(users.id, context.session.user.id));
  const since = userRow?.lastSeenRoadmapAt;

  const conditions = [isNull(roadmapItems.mergedIntoId)];
  if (since) conditions.push(gt(roadmapItems.createdAt, since));

  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(roadmapItems)
    .where(and(...conditions));

  return successResponse({ unseenCount: Number(row?.count ?? 0) });
});

export const POST = withAuthRequired(async (_req, context) => {
  const user = await context.getUser();
  if (!canAccessBetaLab(user?.role)) return forbiddenError("Área restrita");

  await db
    .update(users)
    .set({ lastSeenRoadmapAt: new Date() })
    .where(eq(users.id, context.session.user.id));

  return successResponse({ ok: true });
});
