import withSuperAdminAuthRequired from "@/shared/lib/auth/withSuperAdminAuthRequired";
import { createLogger } from "@/shared/lib/logger";
import { db } from "@/db";
import {
  roadmapComments,
  roadmapItems,
  roadmapVotes,
} from "@/db/schema/roadmap";
import { and, eq, inArray, notInArray, sql } from "drizzle-orm";
import { z } from "zod";
import {
  conflictError,
  internalError,
  notFoundError,
  successResponse,
  validationError,
} from "@/shared/lib/api/responses";
import { recordRoadmapAdminAction } from "@/features/roadmap/server/audit";

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

    const result = await db.transaction(async (tx) => {
      const rows = await tx
        .select({
          id: roadmapItems.id,
          mergedIntoId: roadmapItems.mergedIntoId,
        })
        .from(roadmapItems)
        .where(inArray(roadmapItems.id, [sourceId, targetId]));
      const source = rows.find((r) => r.id === sourceId);
      const target = rows.find((r) => r.id === targetId);
      if (!source || !target) return { kind: "not_found" as const };
      if (source.mergedIntoId) return { kind: "source_merged" as const };
      if (target.mergedIntoId) return { kind: "target_merged" as const };

      // Migrate votes: skip users who already voted on target
      const existingTargetVoterIds = (
        await tx
          .select({ userId: roadmapVotes.userId })
          .from(roadmapVotes)
          .where(eq(roadmapVotes.itemId, targetId))
      ).map((v) => v.userId);

      const votesToMove = existingTargetVoterIds.length
        ? await tx
            .update(roadmapVotes)
            .set({ itemId: targetId })
            .where(
              and(
                eq(roadmapVotes.itemId, sourceId),
                notInArray(roadmapVotes.userId, existingTargetVoterIds)
              )
            )
            .returning({ id: roadmapVotes.id })
        : await tx
            .update(roadmapVotes)
            .set({ itemId: targetId })
            .where(eq(roadmapVotes.itemId, sourceId))
            .returning({ id: roadmapVotes.id });

      // Delete any leftover source votes (the duplicates)
      await tx.delete(roadmapVotes).where(eq(roadmapVotes.itemId, sourceId));

      const movedComments = await tx
        .update(roadmapComments)
        .set({ itemId: targetId })
        .where(eq(roadmapComments.itemId, sourceId))
        .returning({ id: roadmapComments.id });

      await tx
        .update(roadmapItems)
        .set({
          upvotes: sql`(select count(*)::int from ${roadmapVotes} where ${roadmapVotes.itemId} = ${targetId})`,
          commentsCount: sql`(select count(*)::int from ${roadmapComments} where ${roadmapComments.itemId} = ${targetId})`,
          updatedAt: new Date(),
        })
        .where(eq(roadmapItems.id, targetId));

      await tx
        .update(roadmapItems)
        .set({ mergedIntoId: targetId, updatedAt: new Date() })
        .where(eq(roadmapItems.id, sourceId));

      return {
        kind: "ok" as const,
        movedVotes: votesToMove.length,
        movedComments: movedComments.length,
      };
    });

    if (result.kind === "not_found") return notFoundError("Item");
    if (result.kind === "source_merged")
      return conflictError("Item de origem já foi mesclado");
    if (result.kind === "target_merged")
      return conflictError("Item de destino é um item mesclado");

    logger.info(
      `Merged ${sourceId} into ${targetId}: ${result.movedVotes} votes, ${result.movedComments} comments`
    );

    void recordRoadmapAdminAction({
      userId: context.session.user?.id ?? null,
      action: "merge",
      resourceId: sourceId,
      details: {
        targetId,
        movedVotes: result.movedVotes,
        movedComments: result.movedComments,
      },
      req,
    });

    return successResponse({
      ok: true,
      movedVotes: result.movedVotes,
      movedComments: result.movedComments,
    });
  } catch (error) {
    logger.error("merge failed", { error: String(error) });
    return internalError("Falha ao mesclar");
  }
});
