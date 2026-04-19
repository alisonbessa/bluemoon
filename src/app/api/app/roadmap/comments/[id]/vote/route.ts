import withAuthRequired from "@/shared/lib/auth/withAuthRequired";
import { createLogger } from "@/shared/lib/logger";
import { db } from "@/db";
import { roadmapComments, roadmapCommentVotes } from "@/db/schema/roadmap";
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

    const [comment] = await db
      .select({ id: roadmapComments.id })
      .from(roadmapComments)
      .where(eq(roadmapComments.id, id));
    if (!comment) return notFoundError("Comentário");

    try {
      await db.insert(roadmapCommentVotes).values({
        commentId: id,
        userId: context.session.user.id,
      });
    } catch (error) {
      const msg = String(error);
      if (msg.includes("unique") || msg.includes("duplicate")) {
        return conflictError("Você já votou neste comentário");
      }
      throw error;
    }

    const [updated] = await db
      .update(roadmapComments)
      .set({ upvotes: sql`${roadmapComments.upvotes} + 1` })
      .where(eq(roadmapComments.id, id))
      .returning({ upvotes: roadmapComments.upvotes });

    return successResponse({ upvotes: updated.upvotes, hasVoted: true });
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

    const deleted = await db
      .delete(roadmapCommentVotes)
      .where(
        and(
          eq(roadmapCommentVotes.commentId, id),
          eq(roadmapCommentVotes.userId, context.session.user.id)
        )
      )
      .returning({ id: roadmapCommentVotes.id });
    if (deleted.length === 0) return successResponse({ changed: false });

    const [updated] = await db
      .update(roadmapComments)
      .set({ upvotes: sql`GREATEST(${roadmapComments.upvotes} - 1, 0)` })
      .where(eq(roadmapComments.id, id))
      .returning({ upvotes: roadmapComments.upvotes });

    return successResponse({ upvotes: updated.upvotes, hasVoted: false });
  } catch (error) {
    logger.error("DELETE comment vote failed", { error: String(error) });
    return internalError("Falha ao remover voto");
  }
});
