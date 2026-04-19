import withSuperAdminAuthRequired from "@/shared/lib/auth/withSuperAdminAuthRequired";
import { createLogger } from "@/shared/lib/logger";
import { db } from "@/db";
import {
  roadmapItems,
  ROADMAP_CATEGORIES,
  ROADMAP_SOURCES,
  ROADMAP_STATUSES,
  type RoadmapStatus,
  type RoadmapSource,
} from "@/db/schema/roadmap";
import { users } from "@/db/schema/user";
import { and, desc, eq, ilike, or, type SQL } from "drizzle-orm";
import { z } from "zod";
import {
  internalError,
  successResponse,
  validationError,
} from "@/shared/lib/api/responses";
import { recordRoadmapAdminAction } from "@/features/roadmap/server/audit";

const logger = createLogger("api:admin:roadmap");

const createSchema = z.object({
  title: z.string().min(3).max(120),
  description: z.string().min(5).max(4000),
  status: z.enum(ROADMAP_STATUSES).optional().default("planned"),
  category: z.enum(ROADMAP_CATEGORIES).optional(),
  adminNotes: z.string().max(2000).optional(),
});

export const GET = withSuperAdminAuthRequired(async (req) => {
  try {
    const { searchParams } = new URL(req.url);
    const source = searchParams.get("source") as RoadmapSource | null;
    const status = searchParams.get("status") as RoadmapStatus | null;
    const search = searchParams.get("search") || "";

    const conditions: SQL[] = [];
    if (source && (ROADMAP_SOURCES as readonly string[]).includes(source)) {
      conditions.push(eq(roadmapItems.source, source));
    }
    if (status && (ROADMAP_STATUSES as readonly string[]).includes(status)) {
      conditions.push(eq(roadmapItems.status, status));
    }
    if (search) {
      conditions.push(
        or(
          ilike(roadmapItems.title, `%${search}%`),
          ilike(roadmapItems.description, `%${search}%`)
        )!
      );
    }
    const where = conditions.length ? and(...conditions) : undefined;

    const rows = await db
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
        adminNotes: roadmapItems.adminNotes,
        mergedIntoId: roadmapItems.mergedIntoId,
        createdAt: roadmapItems.createdAt,
        implementedAt: roadmapItems.implementedAt,
        authorId: roadmapItems.userId,
        authorName: users.name,
        authorEmail: users.email,
      })
      .from(roadmapItems)
      .leftJoin(users, eq(roadmapItems.userId, users.id))
      .where(where)
      .orderBy(desc(roadmapItems.createdAt))
      .limit(500);

    return successResponse({ items: rows });
  } catch (error) {
    logger.error("GET admin roadmap failed", { error: String(error) });
    return internalError("Falha ao carregar roadmap");
  }
});

export const POST = withSuperAdminAuthRequired(async (req, context) => {
  try {
    const body = await req.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) return validationError(parsed.error);

    const { title, description, status, category, adminNotes } = parsed.data;
    const [created] = await db
      .insert(roadmapItems)
      .values({
        title,
        description,
        status,
        source: "admin",
        category: category ?? null,
        adminNotes: adminNotes ?? null,
        implementedAt: status === "implemented" ? new Date() : null,
      })
      .returning();

    void recordRoadmapAdminAction({
      userId: context.session.user?.id ?? null,
      action: "create",
      resourceId: created.id,
      details: { status, category: category ?? null },
      req,
    });

    return successResponse({ item: created }, 201);
  } catch (error) {
    logger.error("POST admin roadmap failed", { error: String(error) });
    return internalError("Falha ao criar item");
  }
});
