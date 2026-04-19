import withAuthRequired from "@/shared/lib/auth/withAuthRequired";
import { createLogger } from "@/shared/lib/logger";
import { db } from "@/db";
import { roadmapItems, roadmapVotes } from "@/db/schema/roadmap";
import { users } from "@/db/schema/user";
import { and, eq } from "drizzle-orm";
import {
  forbiddenError,
  internalError,
  notFoundError,
  successResponse,
} from "@/shared/lib/api/responses";
import { canAccessBetaLab } from "@/features/roadmap/constants";

const logger = createLogger("api:roadmap:detail");

export const GET = withAuthRequired(async (_req, context) => {
  try {
    const user = await context.getUser();
    if (!canAccessBetaLab(user?.role)) {
      return forbiddenError("Área restrita a usuários beta");
    }

    const params = await context.params;
    const id = params.id as string;
    if (!id) return notFoundError("Item");

    const [row] = await db
      .select({
        id: roadmapItems.id,
        title: roadmapItems.title,
        description: roadmapItems.description,
        status: roadmapItems.status,
        source: roadmapItems.source,
        category: roadmapItems.category,
        upvotes: roadmapItems.upvotes,
        commentsCount: roadmapItems.commentsCount,
        isAnonymous: roadmapItems.isAnonymous,
        createdAt: roadmapItems.createdAt,
        implementedAt: roadmapItems.implementedAt,
        adminNotes: roadmapItems.adminNotes,
        authorId: roadmapItems.userId,
        authorName: users.displayName,
        authorImage: users.image,
      })
      .from(roadmapItems)
      .leftJoin(users, eq(roadmapItems.userId, users.id))
      .where(eq(roadmapItems.id, id));

    if (!row) return notFoundError("Item");

    const [vote] = await db
      .select({ id: roadmapVotes.id })
      .from(roadmapVotes)
      .where(
        and(
          eq(roadmapVotes.itemId, id),
          eq(roadmapVotes.userId, context.session.user.id)
        )
      );

    return successResponse({
      item: {
        id: row.id,
        title: row.title,
        description: row.description,
        status: row.status,
        source: row.source,
        category: row.category,
        upvotes: row.upvotes,
        commentsCount: row.commentsCount,
        createdAt: row.createdAt,
        implementedAt: row.implementedAt,
        adminNotes: row.adminNotes,
        author:
          row.isAnonymous || !row.authorId
            ? null
            : { id: row.authorId, name: row.authorName, image: row.authorImage },
        hasVoted: Boolean(vote),
      },
    });
  } catch (error) {
    logger.error("GET detail failed", { error: String(error) });
    return internalError("Falha ao carregar item");
  }
});
