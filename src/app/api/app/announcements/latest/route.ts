import withAuthRequired from "@/shared/lib/auth/withAuthRequired";
import { db } from "@/db";
import { announcements } from "@/db/schema/announcements";
import { users } from "@/db/schema/user";
import { desc, eq, isNotNull } from "drizzle-orm";
import { successResponse } from "@/shared/lib/api/responses";

export const GET = withAuthRequired(async (_req, context) => {
  const [latest] = await db
    .select({
      id: announcements.id,
      title: announcements.title,
      body: announcements.body,
      ctaLabel: announcements.ctaLabel,
      ctaUrl: announcements.ctaUrl,
      publishedAt: announcements.publishedAt,
    })
    .from(announcements)
    .where(isNotNull(announcements.publishedAt))
    .orderBy(desc(announcements.publishedAt))
    .limit(1);

  if (!latest || !latest.publishedAt) {
    return successResponse({ announcement: null, unseen: false });
  }

  const [userRow] = await db
    .select({
      lastSeenAnnouncementAt: users.lastSeenAnnouncementAt,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(eq(users.id, context.session.user.id));

  // Only show announcements published after the user signed up AND after their
  // last dismissal. New users don't get backlog; users who already dismissed
  // don't see the same announcement twice.
  const baseline =
    userRow?.lastSeenAnnouncementAt ?? userRow?.createdAt ?? new Date(0);
  const unseen = latest.publishedAt > baseline;

  return successResponse({ announcement: latest, unseen });
});

export const dynamic = "force-dynamic";
