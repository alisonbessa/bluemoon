import withAuthRequired from "@/shared/lib/auth/withAuthRequired";
import { createLogger } from "@/shared/lib/logger";
import { db } from "@/db";
import { roadmapItems, roadmapVotes } from "@/db/schema/roadmap";
import { and, eq, sql } from "drizzle-orm";
import {
  conflictError,
  forbiddenError,
  internalError,
  notFoundError,
  successResponse,
} from "@/shared/lib/api/responses";
import { canAccessBetaLab } from "@/features/roadmap/constants";

const logger = createLogger("api:roadmap:vote");

export const POST = withAuthRequired(async (_req, context) => {
  try {
    const user = await context.getUser();
    if (!canAccessBetaLab(user?.role)) {
      return forbiddenError("Somente usuários beta podem votar");
    }

    const params = await context.params;
    const id = params.id as string;
    if (!id) return notFoundError("Item");

    const [item] = await db
      .select({ id: roadmapItems.id, status: roadmapItems.status })
      .from(roadmapItems)
      .where(eq(roadmapItems.id, id));
    if (!item) return notFoundError("Item");
    if (item.status !== "voting") {
      return conflictError("Este item não está mais em votação");
    }

    try {
      await db.insert(roadmapVotes).values({
        itemId: id,
        userId: context.session.user.id,
      });
    } catch (error) {
      const msg = String(error);
      if (msg.includes("unique") || msg.includes("duplicate")) {
        return conflictError("Você já votou neste item");
      }
      throw error;
    }

    const [updated] = await db
      .update(roadmapItems)
      .set({ upvotes: sql`${roadmapItems.upvotes} + 1`, updatedAt: new Date() })
      .where(eq(roadmapItems.id, id))
      .returning({ upvotes: roadmapItems.upvotes });

    return successResponse({ upvotes: updated.upvotes, hasVoted: true });
  } catch (error) {
    logger.error("POST vote failed", { error: String(error) });
    return internalError("Falha ao votar");
  }
});

export const DELETE = withAuthRequired(async (_req, context) => {
  try {
    const user = await context.getUser();
    if (!canAccessBetaLab(user?.role)) {
      return forbiddenError("Somente usuários beta podem votar");
    }
    const params = await context.params;
    const id = params.id as string;
    if (!id) return notFoundError("Item");

    const deleted = await db
      .delete(roadmapVotes)
      .where(
        and(
          eq(roadmapVotes.itemId, id),
          eq(roadmapVotes.userId, context.session.user.id)
        )
      )
      .returning({ id: roadmapVotes.id });

    if (deleted.length === 0) {
      return successResponse({ changed: false });
    }

    const [updated] = await db
      .update(roadmapItems)
      .set({
        upvotes: sql`GREATEST(${roadmapItems.upvotes} - 1, 0)`,
        updatedAt: new Date(),
      })
      .where(eq(roadmapItems.id, id))
      .returning({ upvotes: roadmapItems.upvotes });

    return successResponse({ upvotes: updated.upvotes, hasVoted: false });
  } catch (error) {
    logger.error("DELETE vote failed", { error: String(error) });
    return internalError("Falha ao remover voto");
  }
});
