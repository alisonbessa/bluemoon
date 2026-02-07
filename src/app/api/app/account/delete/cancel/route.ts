import withAuthRequired from "@/shared/lib/auth/withAuthRequired";
import { createLogger } from "@/shared/lib/logger";
import { db } from "@/db";
import { users } from "@/db/schema/user";
import { eq } from "drizzle-orm";
import {
  successResponse,
  internalError,
  errorResponse,
} from "@/shared/lib/api/responses";
import { recordAuditLog } from "@/shared/lib/security/audit-log";

const logger = createLogger("api:account:delete:cancel");

export const POST = withAuthRequired(async (req, context) => {
  try {
    const { session, getUser } = context;

    const user = await getUser();

    if (!user || !("deletionRequestedAt" in user)) {
      return errorResponse("No pending deletion request found", 400);
    }

    const [updatedUser] = await db
      .update(users)
      .set({
        deletedAt: null,
        deletionRequestedAt: null,
        deletionReason: null,
      })
      .where(eq(users.id, session.user.id))
      .returning({ id: users.id });

    if (!updatedUser) {
      return internalError("Failed to cancel account deletion");
    }

    await recordAuditLog({
      userId: session.user.id,
      action: "user.delete",
      resource: "user",
      resourceId: session.user.id,
      details: {
        type: "soft_delete_cancelled",
      },
      req,
    });

    logger.info(`Account deletion cancelled for user ${session.user.id}`);

    return successResponse({
      success: true,
      message: "Account deletion cancelled successfully",
    });
  } catch (error) {
    logger.error("Error cancelling account deletion:", error);
    return internalError("Failed to cancel account deletion");
  }
});
