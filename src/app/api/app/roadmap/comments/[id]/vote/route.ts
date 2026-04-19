import withAuthRequired from "@/shared/lib/auth/withAuthRequired";
import { createLogger } from "@/shared/lib/logger";
import { db } from "@/db";
import {
  roadmapComments,
  roadmapCommentVotes,
  roadmapItems,
} from "@/db/schema/roadmap";
import { and, eq, sql } from "drizzle-orm";
import {
  conflictError,
  forbiddenError,
  internalError,
  notFoundError,
  successResponse,
} from "@/shared/lib/api/responses";
import { canAccessBetaLab } from "@/features/roadmap/constants";

const logger = createLogger("api:roadmap:comment-vote");

export const POST = withAuthRequired(async (_req, context) => {
  try {
    const user = await context.getUser();
    if (!canAccessBetaLab(user?.role)) {
      return forbiddenError("Somente usuários beta podem votar");
    }
    const params = await context.params;
    const id = params.id as string;
    if (!id) return notFoundError("Comentário");

    const result = await db.transaction(async (tx) => {
      const [comment] = await tx
        .select({ id: roadmapComments.id, itemMerged: roadmapItems.mergedIntoId })
        .from(roadmapComments)
        .innerJoin(roadmapItems, eq(roadmapComments.itemId, roadmapItems.id))
        .where(eq(roadmapComments.id, id));
      if (!comment) return { kind: "not_found" as const };
      if (comment.itemMerged) return { kind: "not_found" as const };

      try {
        await tx.insert(roadmapCommentVotes).values({
          commentId: id,
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
        .update(roadmapComments)
        .set({ upvotes: sql`${roadmapComments.upvotes} + 1` })
        .where(eq(roadmapComments.id, id))
        .returning({ upvotes: roadmapComments.upvotes });

      return { kind: "ok" as const, upvotes: updated.upvotes };
    });

    if (result.kind === "not_found") return notFoundError("Comentário");
    if (result.kind === "duplicate") return conflictError("Você já votou neste comentário");
    return successResponse({ upvotes: result.upvotes, hasVoted: true });
  } catch (error) {
    logger.error("POST comment vote failed", { error: String(error) });
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
    if (!id) return notFoundError("Comentário");

    const result = await db.transaction(async (tx) => {
      const deleted = await tx
        .delete(roadmapCommentVotes)
        .where(
          and(
            eq(roadmapCommentVotes.commentId, id),
            eq(roadmapCommentVotes.userId, context.session.user.id)
          )
        )
        .returning({ id: roadmapCommentVotes.id });
      if (deleted.length === 0) return { kind: "noop" as const };

      const [updated] = await tx
        .update(roadmapComments)
        .set({ upvotes: sql`GREATEST(${roadmapComments.upvotes} - 1, 0)` })
        .where(eq(roadmapComments.id, id))
        .returning({ upvotes: roadmapComments.upvotes });
      if (!updated) return { kind: "not_found" as const };

      return { kind: "ok" as const, upvotes: updated.upvotes };
    });

    if (result.kind === "not_found") return notFoundError("Comentário");
    if (result.kind === "noop") return successResponse({ changed: false });
    return successResponse({ upvotes: result.upvotes, hasVoted: false });
  } catch (error) {
    logger.error("DELETE comment vote failed", { error: String(error) });
    return internalError("Falha ao remover voto");
  }
});
