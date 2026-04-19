import withSuperAdminAuthRequired from "@/shared/lib/auth/withSuperAdminAuthRequired";
import { createLogger } from "@/shared/lib/logger";
import { db } from "@/db";
import {
  roadmapItems,
  ROADMAP_CATEGORIES,
  ROADMAP_STATUSES,
  type RoadmapStatus,
} from "@/db/schema/roadmap";
import { users } from "@/db/schema/user";
import { eq } from "drizzle-orm";
import { z } from "zod";
import {
  internalError,
  notFoundError,
  successResponse,
  validationError,
} from "@/shared/lib/api/responses";
import { notifyAuthorOfStatusChange } from "@/features/roadmap/server/notifications";
import { recordRoadmapAdminAction } from "@/features/roadmap/server/audit";

const logger = createLogger("api:admin:roadmap:item");

const patchSchema = z
  .object({
    title: z.string().min(3).max(120).optional(),
    description: z.string().min(5).max(4000).optional(),
    status: z.enum(ROADMAP_STATUSES).optional(),
    category: z.enum(ROADMAP_CATEGORIES).nullable().optional(),
    adminNotes: z.string().max(2000).nullable().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, {
    message: "Nenhum campo para atualizar",
  });

export const PATCH = withSuperAdminAuthRequired(async (req, context) => {
  try {
    const params = await context.params;
    const id = params.id as string;
    if (!id) return notFoundError("Item");

    const body = await req.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) return validationError(parsed.error);

    const [before] = await db
      .select({
        status: roadmapItems.status,
        title: roadmapItems.title,
        userId: roadmapItems.userId,
        isAnonymous: roadmapItems.isAnonymous,
      })
      .from(roadmapItems)
      .where(eq(roadmapItems.id, id));
    if (!before) return notFoundError("Item");

    const updates: Record<string, unknown> = { updatedAt: new Date() };
    for (const [k, v] of Object.entries(parsed.data)) {
      if (v !== undefined) updates[k] = v;
    }

    if (parsed.data.status === "implemented") {
      updates.implementedAt = new Date();
    } else if (parsed.data.status) {
      updates.implementedAt = null;
    }

    const [updated] = await db
      .update(roadmapItems)
      .set(updates as { status?: RoadmapStatus })
      .where(eq(roadmapItems.id, id))
      .returning();
    if (!updated) return notFoundError("Item");

    const statusChanged =
      parsed.data.status && parsed.data.status !== before.status;

    void recordRoadmapAdminAction({
      userId: context.session.user?.id ?? null,
      action: statusChanged ? "status_change" : "update",
      resourceId: id,
      details: {
        before: { status: before.status },
        patch: parsed.data,
      },
      req,
    });

    // Notify author if status changed and item is not anonymous
    if (statusChanged && before.userId && !before.isAnonymous) {
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
    logger.error("PATCH admin roadmap failed", { error: String(error) });
    return internalError("Falha ao atualizar item");
  }
});

export const DELETE = withSuperAdminAuthRequired(async (req, context) => {
  try {
    const params = await context.params;
    const id = params.id as string;
    if (!id) return notFoundError("Item");

    const deleted = await db
      .delete(roadmapItems)
      .where(eq(roadmapItems.id, id))
      .returning({ id: roadmapItems.id });
    if (deleted.length === 0) return notFoundError("Item");

    void recordRoadmapAdminAction({
      userId: context.session.user?.id ?? null,
      action: "delete",
      resourceId: id,
      req,
    });

    return successResponse({ success: true });
  } catch (error) {
    logger.error("DELETE admin roadmap failed", { error: String(error) });
    return internalError("Falha ao excluir item");
  }
});
