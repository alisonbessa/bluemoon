import withAuthRequired from "@/shared/lib/auth/withAuthRequired";
import { createLogger } from "@/shared/lib/logger";
import { db } from "@/db";
import { roadmapItems, roadmapVotes } from "@/db/schema/roadmap";
import { and, eq, isNull, sql } from "drizzle-orm";
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

    const result = await db.transaction(async (tx) => {
      const [item] = await tx
        .select({ id: roadmapItems.id, status: roadmapItems.status })
        .from(roadmapItems)
        .where(and(eq(roadmapItems.id, id), isNull(roadmapItems.mergedIntoId)));
      if (!item) return { kind: "not_found" as const };
      if (item.status !== "voting") return { kind: "closed" as const };

      try {
        await tx.insert(roadmapVotes).values({
          itemId: id,
          userId: context.session.user.id,
        });
      } catch (error) {
        const msg = String(error);
        if (msg.includes("unique") || msg.includes("duplicate")) {
          return { kind: "duplicate" as const };
        }
        throw error;
      }

      const [updated] = await tx
        .update(roadmapItems)
        .set({ upvotes: sql`${roadmapItems.upvotes} + 1`, updatedAt: new Date() })
        .where(eq(roadmapItems.id, id))
        .returning({ upvotes: roadmapItems.upvotes });

      return { kind: "ok" as const, upvotes: updated.upvotes };
    });

    if (result.kind === "not_found") return notFoundError("Item");
    if (result.kind === "closed") return conflictError("Este item não está mais em votação");
    if (result.kind === "duplicate") return conflictError("Você já votou neste item");
    return successResponse({ upvotes: result.upvotes, hasVoted: true });
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

    const result = await db.transaction(async (tx) => {
      const [item] = await tx
        .select({ id: roadmapItems.id })
        .from(roadmapItems)
        .where(and(eq(roadmapItems.id, id), isNull(roadmapItems.mergedIntoId)));
      if (!item) return { kind: "not_found" as const };

      const deleted = await tx
        .delete(roadmapVotes)
        .where(
          and(
            eq(roadmapVotes.itemId, id),
            eq(roadmapVotes.userId, context.session.user.id)
          )
        )
        .returning({ id: roadmapVotes.id });

      if (deleted.length === 0) return { kind: "noop" as const };

      const [updated] = await tx
        .update(roadmapItems)
        .set({
          upvotes: sql`GREATEST(${roadmapItems.upvotes} - 1, 0)`,
          updatedAt: new Date(),
        })
        .where(eq(roadmapItems.id, id))
        .returning({ upvotes: roadmapItems.upvotes });

      return { kind: "ok" as const, upvotes: updated.upvotes };
    });

    if (result.kind === "not_found") return notFoundError("Item");
    if (result.kind === "noop") return successResponse({ changed: false });
    return successResponse({ upvotes: result.upvotes, hasVoted: false });
  } catch (error) {
    logger.error("DELETE vote failed", { error: String(error) });
    return internalError("Falha ao remover voto");
  }
});
