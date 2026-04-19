import withAuthRequired from "@/shared/lib/auth/withAuthRequired";
import { db } from "@/db";
import { users } from "@/db/schema/user";
import { eq } from "drizzle-orm";
import { successResponse } from "@/shared/lib/api/responses";

export const POST = withAuthRequired(async (_req, context) => {
  await db
    .update(users)
    .set({ lastSeenAnnouncementAt: new Date() })
    .where(eq(users.id, context.session.user.id));
  return successResponse({ ok: true });
});
