import withSuperAdminAuthRequired from "@/shared/lib/auth/withSuperAdminAuthRequired";
import { createLogger } from "@/shared/lib/logger";
import { db } from "@/db";
import { roadmapItems } from "@/db/schema/roadmap";
import { users } from "@/db/schema/user";
import { eq } from "drizzle-orm";
import {
  conflictError,
  internalError,
  notFoundError,
  successResponse,
} from "@/shared/lib/api/responses";
import { recordRoadmapAdminAction } from "@/features/roadmap/server/audit";
import { notifyAuthorOfStatusChange } from "@/features/roadmap/server/notifications";

const logger = createLogger("api:admin:roadmap:promote");

export const POST = withSuperAdminAuthRequired(async (req, context) => {
  try {
    const params = await context.params;
    const id = params.id as string;
    if (!id) return notFoundError("Item");

    const [before] = await db
      .select({
        source: roadmapItems.source,
        status: roadmapItems.status,
        mergedIntoId: roadmapItems.mergedIntoId,
        userId: roadmapItems.userId,
        isAnonymous: roadmapItems.isAnonymous,
      })
      .from(roadmapItems)
      .where(eq(roadmapItems.id, id));
    if (!before) return notFoundError("Item");
    if (before.mergedIntoId) return conflictError("Item já foi mesclado");
    if (before.source === "admin") return conflictError("Item já está no roadmap");

    const [updated] = await db
      .update(roadmapItems)
      .set({ source: "admin", status: "planned", updatedAt: new Date() })
      .where(eq(roadmapItems.id, id))
      .returning();
    if (!updated) return notFoundError("Item");

    void recordRoadmapAdminAction({
      userId: context.session.user?.id ?? null,
      action: "promote",
      resourceId: id,
      details: { from: { source: before.source, status: before.status } },
      req,
    });

    if (before.userId && !before.isAnonymous) {
      const [author] = await db
        .select({ email: users.email, name: users.displayName })
        .from(users)
        .where(eq(users.id, before.userId));
      if (author?.email) {
        void notifyAuthorOfStatusChange({
          toEmail: author.email,
          toName: author.name ?? null,
          itemId: updated.id,
          itemTitle: updated.title,
          newStatus: updated.status,
          adminNotes: updated.adminNotes,
        });
      }
    }

    return successResponse({ item: updated });
  } catch (error) {
    logger.error("promote failed", { error: String(error) });
    return internalError("Falha ao promover item");
  }
});
