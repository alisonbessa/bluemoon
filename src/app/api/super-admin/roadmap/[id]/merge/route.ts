import withSuperAdminAuthRequired from "@/shared/lib/auth/withSuperAdminAuthRequired";
import { createLogger } from "@/shared/lib/logger";
import { db } from "@/db";
import {
  roadmapComments,
  roadmapItems,
  roadmapVotes,
} from "@/db/schema/roadmap";
import { and, eq, notInArray, sql } from "drizzle-orm";
import { z } from "zod";
import {
  conflictError,
  internalError,
  notFoundError,
  successResponse,
  validationError,
} from "@/shared/lib/api/responses";

const logger = createLogger("api:admin:roadmap:merge");

const mergeSchema = z.object({
  targetId: z.string().min(1),
});

export const POST = withSuperAdminAuthRequired(async (req, context) => {
  try {
    const params = await context.params;
    const sourceId = params.id as string;
    if (!sourceId) return notFoundError("Item");

    const body = await req.json();
    const parsed = mergeSchema.safeParse(body);
    if (!parsed.success) return validationError(parsed.error);
    const { targetId } = parsed.data;

    if (sourceId === targetId) {
      return conflictError("Não é possível mesclar um item com ele mesmo");
    }

    const rows = await db
      .select({
        id: roadmapItems.id,
        status: roadmapItems.status,
        mergedIntoId: roadmapItems.mergedIntoId,
      })
      .from(roadmapItems)
      .where(sql`${roadmapItems.id} in (${sourceId}, ${targetId})`);
    const source = rows.find((r) => r.id === sourceId);
    const target = rows.find((r) => r.id === targetId);
    if (!source || !target) return notFoundError("Item");
    if (source.mergedIntoId) {
      return conflictError("Item de origem já foi mesclado");
    }
    if (target.mergedIntoId) {
      return conflictError("Item de destino é um item mesclado");
    }

    // Migrate votes: skip users who already voted on target
    const existingTargetVoterIds = (
      await db
        .select({ userId: roadmapVotes.userId })
        .from(roadmapVotes)
        .where(eq(roadmapVotes.itemId, targetId))
    ).map((v) => v.userId);

    const votesToMove = existingTargetVoterIds.length
      ? await db
          .update(roadmapVotes)
          .set({ itemId: targetId })
          .where(
            and(
              eq(roadmapVotes.itemId, sourceId),
              notInArray(roadmapVotes.userId, existingTargetVoterIds)
            )
          )
          .returning({ id: roadmapVotes.id })
      : await db
          .update(roadmapVotes)
          .set({ itemId: targetId })
          .where(eq(roadmapVotes.itemId, sourceId))
          .returning({ id: roadmapVotes.id });

    // Delete any leftover source votes (duplicates)
    await db.delete(roadmapVotes).where(eq(roadmapVotes.itemId, sourceId));

    // Move comments
    const movedComments = await db
      .update(roadmapComments)
      .set({ itemId: targetId })
      .where(eq(roadmapComments.itemId, sourceId))
      .returning({ id: roadmapComments.id });

    // Recompute counts on target
    await db
      .update(roadmapItems)
      .set({
        upvotes: sql`(select count(*)::int from ${roadmapVotes} where ${roadmapVotes.itemId} = ${targetId})`,
        commentsCount: sql`(select count(*)::int from ${roadmapComments} where ${roadmapComments.itemId} = ${targetId})`,
        updatedAt: new Date(),
      })
      .where(eq(roadmapItems.id, targetId));

    // Mark source as merged
    await db
      .update(roadmapItems)
      .set({ mergedIntoId: targetId, updatedAt: new Date() })
      .where(eq(roadmapItems.id, sourceId));

    logger.info(
      `Merged ${sourceId} into ${targetId}: ${votesToMove.length} votes, ${movedComments.length} comments`
    );

    return successResponse({
      ok: true,
      movedVotes: votesToMove.length,
      movedComments: movedComments.length,
    });
  } catch (error) {
    logger.error("merge failed", { error: String(error) });
    return internalError("Falha ao mesclar");
  }
});
