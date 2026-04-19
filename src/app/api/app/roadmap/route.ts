import withAuthRequired from "@/shared/lib/auth/withAuthRequired";
import { createLogger } from "@/shared/lib/logger";
import { db } from "@/db";
import {
  roadmapItems,
  roadmapVotes,
  ROADMAP_CATEGORIES,
  ROADMAP_STATUSES,
  type RoadmapCategory,
  type RoadmapStatus,
} from "@/db/schema/roadmap";
import { users } from "@/db/schema/user";
import { and, desc, eq, ilike, inArray, isNull, or, sql, type SQL } from "drizzle-orm";
import { z } from "zod";
import {
  forbiddenError,
  internalError,
  structuredError,
  successResponse,
  validationError,
} from "@/shared/lib/api/responses";
import { canAccessBetaLab } from "@/features/roadmap/constants";
import {
  findSimilarItems,
  moderateSubmission,
} from "@/features/roadmap/server/ai-moderation";
import { checkSuggestionRateLimit } from "@/features/roadmap/server/rate-limit";
import { notifyAdminsOfNewSuggestion } from "@/features/roadmap/server/notifications";

const logger = createLogger("api:roadmap");

const DESCRIPTION_PREVIEW_CHARS = 320;
const MAX_PAGE_SIZE = 50;
const DEFAULT_PAGE_SIZE = 20;

const createSchema = z.object({
  title: z.string().min(4, "Título muito curto").max(120),
  description: z.string().min(10, "Descrição muito curta").max(2000),
  category: z.enum(ROADMAP_CATEGORIES).optional(),
  isAnonymous: z.boolean().optional().default(false),
  skipSimilarity: z.boolean().optional().default(false),
});

const listQuerySchema = z.object({
  tab: z.enum(["roadmap", "requests"]).optional(),
  status: z.string().optional(),
  category: z.string().optional(),
  search: z.string().optional(),
  sort: z.enum(["votes", "newest"]).optional().default("votes"),
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).optional().default(DEFAULT_PAGE_SIZE),
});

export const GET = withAuthRequired(async (req, context) => {
  try {
    const user = await context.getUser();
    if (!canAccessBetaLab(user?.role)) {
      return forbiddenError("Área restrita a usuários beta");
    }

    const { searchParams } = new URL(req.url);
    const parsed = listQuerySchema.safeParse({
      tab: searchParams.get("tab") ?? undefined,
      status: searchParams.get("status") ?? undefined,
      category: searchParams.get("category") ?? undefined,
      search: searchParams.get("search") ?? undefined,
      sort: searchParams.get("sort") ?? undefined,
      page: searchParams.get("page") ?? undefined,
      pageSize: searchParams.get("pageSize") ?? undefined,
    });
    if (!parsed.success) return validationError(parsed.error);
    const { tab, status, category, search, sort, page, pageSize } = parsed.data;

    const conditions: SQL[] = [isNull(roadmapItems.mergedIntoId)];
    if (tab === "roadmap") conditions.push(eq(roadmapItems.source, "admin"));
    if (tab === "requests") conditions.push(eq(roadmapItems.source, "user"));
    if (status && ROADMAP_STATUSES.includes(status as RoadmapStatus)) {
      conditions.push(eq(roadmapItems.status, status as RoadmapStatus));
    }
    if (category) {
      conditions.push(eq(roadmapItems.category, category as RoadmapCategory));
    }
    if (search) {
      conditions.push(
        or(
          ilike(roadmapItems.title, `%${search}%`),
          ilike(roadmapItems.description, `%${search}%`)
        )!
      );
    }
    const where = and(...conditions);

    const orderBy =
      sort === "newest"
        ? desc(roadmapItems.createdAt)
        : desc(roadmapItems.upvotes);

    const offset = (page - 1) * pageSize;

    const rows = await db
      .select({
        id: roadmapItems.id,
        title: roadmapItems.title,
        // Description is truncated in SQL to keep the payload small — detail
        // view fetches the full text from /api/app/roadmap/[id].
        descriptionPreview: sql<string>`left(${roadmapItems.description}, ${DESCRIPTION_PREVIEW_CHARS})`,
        status: roadmapItems.status,
        source: roadmapItems.source,
        category: roadmapItems.category,
        upvotes: roadmapItems.upvotes,
        commentsCount: roadmapItems.commentsCount,
        isAnonymous: roadmapItems.isAnonymous,
        createdAt: roadmapItems.createdAt,
        implementedAt: roadmapItems.implementedAt,
        authorId: roadmapItems.userId,
        authorName: users.displayName,
        authorImage: users.image,
      })
      .from(roadmapItems)
      .leftJoin(users, eq(roadmapItems.userId, users.id))
      .where(where)
      .orderBy(orderBy)
      .limit(pageSize + 1)
      .offset(offset);

    const hasMore = rows.length > pageSize;
    const sliced = hasMore ? rows.slice(0, pageSize) : rows;

    const ids = sliced.map((r) => r.id);
    const userVoteRows = ids.length
      ? await db
          .select({ itemId: roadmapVotes.itemId })
          .from(roadmapVotes)
          .where(
            and(
              eq(roadmapVotes.userId, context.session.user.id),
              inArray(roadmapVotes.itemId, ids)
            )
          )
      : [];
    const votedSet = new Set(userVoteRows.map((v) => v.itemId));

    const items = sliced.map((r) => ({
      id: r.id,
      title: r.title,
      description: r.descriptionPreview,
      status: r.status,
      source: r.source,
      category: r.category,
      upvotes: r.upvotes,
      commentsCount: r.commentsCount,
      createdAt: r.createdAt,
      implementedAt: r.implementedAt,
      author:
        r.isAnonymous || !r.authorId
          ? null
          : { id: r.authorId, name: r.authorName, image: r.authorImage },
      hasVoted: votedSet.has(r.id),
    }));

    return successResponse({ items, page, pageSize, hasMore });
  } catch (error) {
    logger.error("GET /api/app/roadmap failed", { error: String(error) });
    return internalError("Falha ao carregar roadmap");
  }
});

export const POST = withAuthRequired(async (req, context) => {
  try {
    const user = await context.getUser();
    if (!canAccessBetaLab(user?.role)) {
      return forbiddenError("Somente usuários beta podem sugerir");
    }

    const body = await req.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) return validationError(parsed.error);
    const { title, description, category, isAnonymous, skipSimilarity } = parsed.data;

    const rate = await checkSuggestionRateLimit(context.session.user.id);
    if (!rate.allowed) {
      return structuredError({ error: "rate_limited", reason: rate.message }, 429);
    }

    const moderation = await moderateSubmission({ title, description });
    if (!moderation.ok) {
      return structuredError(
        {
          error: "moderation_rejected",
          reason: moderation.reason ?? "Conteúdo impróprio detectado.",
        },
        422
      );
    }

    if (!skipSimilarity) {
      const keywords = title
        .split(/\s+/)
        .filter((w) => w.length > 3)
        .slice(0, 5);
      const textConditions = keywords.map((k) =>
        or(
          ilike(roadmapItems.title, `%${k}%`),
          ilike(roadmapItems.description, `%${k}%`)
        )!
      );
      const candidates = keywords.length
        ? await db
            .select({
              id: roadmapItems.id,
              title: roadmapItems.title,
              description: roadmapItems.description,
            })
            .from(roadmapItems)
            .where(and(or(...textConditions), isNull(roadmapItems.mergedIntoId)))
            .limit(10)
        : [];

      if (candidates.length) {
        const matches = await findSimilarItems(
          { title, description },
          candidates.map((c) => ({
            id: c.id,
            title: c.title,
            description: c.description.slice(0, 400),
          }))
        );
        if (matches.length) {
          const full = await db
            .select({
              id: roadmapItems.id,
              title: roadmapItems.title,
              status: roadmapItems.status,
              upvotes: roadmapItems.upvotes,
            })
            .from(roadmapItems)
            .where(inArray(roadmapItems.id, matches.map((m) => m.id)));
          return successResponse({
            similarFound: true,
            matches: matches.map((m) => ({
              ...m,
              item: full.find((f) => f.id === m.id) ?? null,
            })),
          });
        }
      }
    }

    const [created] = await db
      .insert(roadmapItems)
      .values({
        title,
        description,
        category: category ?? null,
        source: "user",
        status: "voting",
        userId: context.session.user.id,
        isAnonymous,
      })
      .returning();

    logger.info(`Roadmap request created by ${context.session.user.id}`);

    void notifyAdminsOfNewSuggestion({
      itemId: created.id,
      title: created.title,
      description: created.description,
      authorEmail: isAnonymous ? null : user?.email ?? null,
      authorName: isAnonymous ? null : user?.name ?? null,
    });

    return successResponse({ item: created, similarFound: false }, 201);
  } catch (error) {
    logger.error("POST /api/app/roadmap failed", { error: String(error) });
    return internalError("Falha ao criar sugestão");
  }
});

export const dynamic = "force-dynamic";
