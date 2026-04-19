import withAuthRequired from "@/shared/lib/auth/withAuthRequired";
import { createLogger } from "@/shared/lib/logger";
import { db } from "@/db";
import {
  roadmapComments,
  roadmapCommentVotes,
  roadmapItems,
} from "@/db/schema/roadmap";
import { users } from "@/db/schema/user";
import { and, asc, eq, inArray, isNull, sql } from "drizzle-orm";
import { z } from "zod";
import {
  forbiddenError,
  internalError,
  notFoundError,
  structuredError,
  successResponse,
  validationError,
} from "@/shared/lib/api/responses";
import { canAccessBetaLab } from "@/features/roadmap/constants";
import { moderateSubmission } from "@/features/roadmap/server/ai-moderation";
import { checkCommentRateLimit } from "@/features/roadmap/server/rate-limit";

const logger = createLogger("api:roadmap:comments");

const commentSchema = z.object({
  content: z.string().min(2).max(1000),
  isAnonymous: z.boolean().optional().default(false),
});

export const GET = withAuthRequired(async (_req, context) => {
  try {
    const user = await context.getUser();
    if (!canAccessBetaLab(user?.role)) {
      return forbiddenError("Área restrita a usuários beta");
    }
    const params = await context.params;
    const id = params.id as string;
    if (!id) return notFoundError("Item");

    const rows = await db
      .select({
        id: roadmapComments.id,
        content: roadmapComments.content,
        isAnonymous: roadmapComments.isAnonymous,
        upvotes: roadmapComments.upvotes,
        createdAt: roadmapComments.createdAt,
        authorId: roadmapComments.userId,
        authorName: users.displayName,
        authorImage: users.image,
        authorRole: users.role,
      })
      .from(roadmapComments)
      .leftJoin(users, eq(roadmapComments.userId, users.id))
      .where(eq(roadmapComments.itemId, id))
      .orderBy(asc(roadmapComments.createdAt));

    const ids = rows.map((r) => r.id);
    const votedIds = ids.length
      ? new Set(
          (
            await db
              .select({ commentId: roadmapCommentVotes.commentId })
              .from(roadmapCommentVotes)
              .where(
                and(
                  eq(roadmapCommentVotes.userId, context.session.user.id),
                  inArray(roadmapCommentVotes.commentId, ids)
                )
              )
          ).map((v) => v.commentId)
        )
      : new Set<string>();

    const comments = rows.map((r) => ({
      id: r.id,
      content: r.content,
      createdAt: r.createdAt,
      upvotes: r.upvotes,
      hasVoted: votedIds.has(r.id),
      isTeam: r.authorRole === "admin",
      author:
        r.isAnonymous || !r.authorId
          ? null
          : { id: r.authorId, name: r.authorName, image: r.authorImage },
    }));

    return successResponse({ comments });
  } catch (error) {
    logger.error("GET comments failed", { error: String(error) });
    return internalError("Falha ao carregar comentários");
  }
});

export const POST = withAuthRequired(async (req, context) => {
  try {
    const user = await context.getUser();
    if (!canAccessBetaLab(user?.role)) {
      return forbiddenError("Somente usuários beta podem comentar");
    }
    const params = await context.params;
    const id = params.id as string;
    if (!id) return notFoundError("Item");

    const body = await req.json();
    const parsed = commentSchema.safeParse(body);
    if (!parsed.success) return validationError(parsed.error);

    const rate = await checkCommentRateLimit(context.session.user.id);
    if (!rate.allowed) {
      return structuredError({ error: "rate_limited", reason: rate.message }, 429);
    }

    const moderation = await moderateSubmission({
      title: "comentário",
      description: parsed.data.content,
    });
    if (!moderation.ok) {
      return structuredError(
        {
          error: "moderation_rejected",
          reason: moderation.reason ?? "Conteúdo impróprio detectado.",
        },
        422
      );
    }

    const result = await db.transaction(async (tx) => {
      const [item] = await tx
        .select({ id: roadmapItems.id })
        .from(roadmapItems)
        .where(and(eq(roadmapItems.id, id), isNull(roadmapItems.mergedIntoId)));
      if (!item) return { kind: "not_found" as const };

      const [comment] = await tx
        .insert(roadmapComments)
        .values({
          itemId: id,
          userId: context.session.user.id,
          content: parsed.data.content,
          isAnonymous: parsed.data.isAnonymous,
        })
        .returning();

      await tx
        .update(roadmapItems)
        .set({
          commentsCount: sql`${roadmapItems.commentsCount} + 1`,
          updatedAt: new Date(),
        })
        .where(eq(roadmapItems.id, id));

      return { kind: "ok" as const, comment };
    });

    if (result.kind === "not_found") return notFoundError("Item");
    return successResponse({ comment: result.comment }, 201);
  } catch (error) {
    logger.error("POST comment failed", { error: String(error) });
    return internalError("Falha ao comentar");
  }
});
