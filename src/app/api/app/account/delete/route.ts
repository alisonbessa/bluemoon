import withAuthRequired from "@/shared/lib/auth/withAuthRequired";
import { createLogger } from "@/shared/lib/logger";
import { db } from "@/db";
import { users } from "@/db/schema/user";
import { eq } from "drizzle-orm";
import { z } from "zod";
import {
  validationError,
  successResponse,
  internalError,
} from "@/shared/lib/api/responses";
import { recordAuditLog } from "@/shared/lib/security/audit-log";

const logger = createLogger("api:account:delete");

const GRACE_PERIOD_DAYS = 30;

const deletionRequestSchema = z.object({
  reason: z.string().max(1000).optional(),
});

export const POST = withAuthRequired(async (req, context) => {
  try {
    const { session } = context;
    const body = await req.json().catch(() => ({}));

    const validation = deletionRequestSchema.safeParse(body);
    if (!validation.success) {
      return validationError(validation.error);
    }

    const { reason } = validation.data;

    const now = new Date();
    const deletedAt = new Date(now);
    deletedAt.setDate(deletedAt.getDate() + GRACE_PERIOD_DAYS);

    const [updatedUser] = await db
      .update(users)
      .set({
        deletionRequestedAt: now,
        deletedAt,
        deletionReason: reason ?? null,
      })
      .where(eq(users.id, session.user.id))
      .returning({ id: users.id });

    if (!updatedUser) {
      return internalError("Failed to request account deletion");
    }

    await recordAuditLog({
      userId: session.user.id,
      action: "user.delete",
      resource: "user",
      resourceId: session.user.id,
      details: {
        type: "soft_delete_requested",
        gracePeriodDays: GRACE_PERIOD_DAYS,
        scheduledDeletionAt: deletedAt.toISOString(),
        reason: reason ?? null,
      },
      req,
    });

    logger.info(
      `Account deletion requested for user ${session.user.id}, scheduled for ${deletedAt.toISOString()}`
    );

    return successResponse({
      success: true,
      message: "Account deletion requested successfully",
      deletionRequestedAt: now.toISOString(),
      scheduledDeletionAt: deletedAt.toISOString(),
      gracePeriodDays: GRACE_PERIOD_DAYS,
    });
  } catch (error) {
    logger.error("Error requesting account deletion:", error);
    return internalError("Failed to request account deletion");
  }
});
