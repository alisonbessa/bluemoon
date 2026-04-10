import withAuthRequired from "@/shared/lib/auth/withAuthRequired";
import { createLogger } from "@/shared/lib/logger";
import { db } from "@/db";
import { budgets, budgetMembers, users } from "@/db/schema";
import { eq, and, ne } from "drizzle-orm";
import { z } from "zod";
import { privacyModeEnum } from "@/db/schema/budgets";
import {
  validationError,
  forbiddenError,
  successResponse,
  errorResponse,
  internalError,
} from "@/shared/lib/api/responses";
import sendMail from "@/shared/lib/email/sendMail";
import { render } from "@react-email/components";
import PrivacyChangeRequestEmail from "@/emails/PrivacyChangeRequestEmail";
import { appConfig } from "@/shared/lib/config";
import { signPrivacyToken } from "@/app/api/public/budget-privacy/route";

const logger = createLogger("api:budget:privacy");

const requestPrivacyChangeSchema = z.object({
  budgetId: z.string().uuid(),
  privacyMode: privacyModeEnum,
});

// PATCH - Request privacy mode change (requires partner confirmation)
export const PATCH = withAuthRequired(async (request, context) => {
  const { session } = context;

  try {
    const body = await request.json();
    const validation = requestPrivacyChangeSchema.safeParse(body);
    if (!validation.success) {
      return validationError(validation.error);
    }

    const { budgetId, privacyMode: requestedMode } = validation.data;

    // Verify user is a member of this budget
    const [membership] = await db
      .select()
      .from(budgetMembers)
      .where(
        and(
          eq(budgetMembers.budgetId, budgetId),
          eq(budgetMembers.userId, session.user.id)
        )
      )
      .limit(1);

    if (!membership) {
      return forbiddenError("Unauthorized");
    }

    // Get current budget
    const [budget] = await db
      .select()
      .from(budgets)
      .where(eq(budgets.id, budgetId))
      .limit(1);

    if (!budget) {
      return errorResponse("Budget not found", 404);
    }

    // If same as current mode, nothing to do
    if (budget.privacyMode === requestedMode) {
      return successResponse({ message: "Privacy mode is already set to this value" });
    }

    // Find the partner member (the other adult member)
    const [partner] = await db
      .select({
        member: budgetMembers,
        user: users,
      })
      .from(budgetMembers)
      .innerJoin(users, eq(budgetMembers.userId, users.id))
      .where(
        and(
          eq(budgetMembers.budgetId, budgetId),
          ne(budgetMembers.userId, session.user.id)
        )
      )
      .limit(1);

    // If no partner (Solo budget), apply directly
    if (!partner) {
      const [updated] = await db
        .update(budgets)
        .set({
          privacyMode: requestedMode,
          pendingPrivacyMode: null,
          privacyChangeRequestedBy: null,
          updatedAt: new Date(),
        })
        .where(eq(budgets.id, budgetId))
        .returning();

      return successResponse({ budget: updated, applied: true });
    }

    // Set pending privacy mode change
    const [updated] = await db
      .update(budgets)
      .set({
        pendingPrivacyMode: requestedMode,
        privacyChangeRequestedBy: membership.id,
        updatedAt: new Date(),
      })
      .where(eq(budgets.id, budgetId))
      .returning();

    // Send email to partner for confirmation (signed JWT token, no login required)
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || "";
    const confirmToken = await signPrivacyToken({ budgetId, membershipId: partner.member.id });
    const rejectToken = await signPrivacyToken({ budgetId, membershipId: partner.member.id });
    const confirmUrl = `${baseUrl}/api/public/budget-privacy?action=confirm&token=${confirmToken}`;
    const rejectUrl = `${baseUrl}/api/public/budget-privacy?action=reject&token=${rejectToken}`;

    const requesterName = membership.name;
    const partnerEmail = partner.user.email;

    if (partnerEmail) {
      const emailHtml = await render(
        PrivacyChangeRequestEmail({
          requesterName,
          budgetName: budget.name,
          currentMode: budget.privacyMode || "visible",
          requestedMode,
          confirmUrl,
          rejectUrl,
        })
      );

      await sendMail(
        partnerEmail,
        `${requesterName} quer alterar a privacidade no ${appConfig.projectName}`,
        emailHtml
      );
    }

    return successResponse({
      budget: updated,
      applied: false,
      message: "Solicitação enviada. O parceiro receberá um email para confirmar.",
    });
  } catch (error) {
    logger.error("Error requesting privacy change:", error);
    return internalError("Failed to request privacy change");
  }
});
