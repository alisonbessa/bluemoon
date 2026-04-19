import withSuperAdminAuthRequired from "@/shared/lib/auth/withSuperAdminAuthRequired";
import { createLogger } from "@/shared/lib/logger";
import { db } from "@/db";
import {
  roadmapItems,
  ROADMAP_STATUSES,
  type RoadmapStatus,
} from "@/db/schema/roadmap";
import { eq } from "drizzle-orm";
import { z } from "zod";
import {
  internalError,
  notFoundError,
  successResponse,
  validationError,
} from "@/shared/lib/api/responses";

const logger = createLogger("api:admin:roadmap:item");

const patchSchema = z
  .object({
    title: z.string().min(3).max(120).optional(),
    description: z.string().min(5).max(4000).optional(),
    status: z.enum(ROADMAP_STATUSES).optional(),
    category: z.string().max(60).nullable().optional(),
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

    return successResponse({ item: updated });
  } catch (error) {
    logger.error("PATCH admin roadmap failed", { error: String(error) });
    return internalError("Falha ao atualizar item");
  }
});

export const DELETE = withSuperAdminAuthRequired(async (_req, context) => {
  try {
    const params = await context.params;
    const id = params.id as string;
    if (!id) return notFoundError("Item");

    const deleted = await db
      .delete(roadmapItems)
      .where(eq(roadmapItems.id, id))
      .returning({ id: roadmapItems.id });
    if (deleted.length === 0) return notFoundError("Item");

    return successResponse({ success: true });
  } catch (error) {
    logger.error("DELETE admin roadmap failed", { error: String(error) });
    return internalError("Falha ao excluir item");
  }
});
