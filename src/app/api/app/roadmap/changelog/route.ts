import withAuthRequired from "@/shared/lib/auth/withAuthRequired";
import { db } from "@/db";
import { roadmapItems } from "@/db/schema/roadmap";
import { desc, eq, and, isNotNull, isNull } from "drizzle-orm";
import { forbiddenError, successResponse } from "@/shared/lib/api/responses";
import { canAccessBetaLab } from "@/features/roadmap/constants";

export const GET = withAuthRequired(async (_req, context) => {
  const user = await context.getUser();
  if (!canAccessBetaLab(user?.role)) return forbiddenError("Área restrita");

  const rows = await db
    .select({
      id: roadmapItems.id,
      title: roadmapItems.title,
      description: roadmapItems.description,
      category: roadmapItems.category,
      source: roadmapItems.source,
      implementedAt: roadmapItems.implementedAt,
      adminNotes: roadmapItems.adminNotes,
    })
    .from(roadmapItems)
    .where(
      and(
        eq(roadmapItems.status, "implemented"),
        isNotNull(roadmapItems.implementedAt),
        isNull(roadmapItems.mergedIntoId)
      )
    )
    .orderBy(desc(roadmapItems.implementedAt))
    .limit(50);

  return successResponse({ entries: rows });
});
