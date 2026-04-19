import { db } from "@/db";
import { roadmapItems, roadmapComments } from "@/db/schema/roadmap";
import { and, eq, gte, sql } from "drizzle-orm";

export const RATE_LIMITS = {
  suggestionsPerDay: 10,
  commentsPerHour: 30,
} as const;

export interface RateLimitCheck {
  allowed: boolean;
  message?: string;
}

export async function checkSuggestionRateLimit(userId: string): Promise<RateLimitCheck> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(roadmapItems)
    .where(
      and(
        eq(roadmapItems.userId, userId),
        eq(roadmapItems.source, "user"),
        gte(roadmapItems.createdAt, since)
      )
    );
  if (Number(row?.count ?? 0) >= RATE_LIMITS.suggestionsPerDay) {
    return {
      allowed: false,
      message: `Você atingiu o limite de ${RATE_LIMITS.suggestionsPerDay} sugestões em 24h. Tente novamente amanhã.`,
    };
  }
  return { allowed: true };
}

export async function checkCommentRateLimit(userId: string): Promise<RateLimitCheck> {
  const since = new Date(Date.now() - 60 * 60 * 1000);
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(roadmapComments)
    .where(
      and(eq(roadmapComments.userId, userId), gte(roadmapComments.createdAt, since))
    );
  if (Number(row?.count ?? 0) >= RATE_LIMITS.commentsPerHour) {
    return {
      allowed: false,
      message: `Você atingiu o limite de ${RATE_LIMITS.commentsPerHour} comentários por hora.`,
    };
  }
  return { allowed: true };
}
