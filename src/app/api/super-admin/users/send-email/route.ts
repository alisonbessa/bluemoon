import { NextRequest, NextResponse } from "next/server";
import withSuperAdminAuthRequired from "@/shared/lib/auth/withSuperAdminAuthRequired";
import { db } from "@/db";
import { users } from "@/db/schema/user";
import { inArray, isNull, and } from "drizzle-orm";
import { render } from "@react-email/render";
import sendMail from "@/shared/lib/email/sendMail";
import AdminMessage from "@/emails/AdminMessage";
import { createLogger } from "@/shared/lib/logger";

const logger = createLogger("api:admin:send-email");

/**
 * POST /api/super-admin/users/send-email
 *
 * Body:
 *   userIds: string[] - list of user IDs to email
 *   subject: string
 *   body: string - plain text message body (newlines preserved)
 *   ctaText?: string - optional button text
 *   ctaUrl?: string - optional button URL
 */
export const POST = withSuperAdminAuthRequired(async (req: NextRequest) => {
  const { userIds, subject, body, ctaText, ctaUrl } = await req.json();

  if (!userIds?.length || !subject || !body) {
    return NextResponse.json(
      { error: "userIds, subject, and body are required" },
      { status: 400 }
    );
  }

  if (userIds.length > 100) {
    return NextResponse.json(
      { error: "Maximum 100 users per batch" },
      { status: 400 }
    );
  }

  // Fetch user emails
  const targetUsers = await db
    .select({ id: users.id, name: users.name, email: users.email })
    .from(users)
    .where(and(inArray(users.id, userIds), isNull(users.deletedAt)));

  let sent = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const user of targetUsers) {
    try {
      const html = await render(
        AdminMessage({
          userName: user.name || "usuario",
          subject,
          body,
          ctaText,
          ctaUrl,
        })
      );

      await sendMail(user.email, subject, html);
      sent++;
    } catch (error) {
      failed++;
      errors.push(`${user.email}: ${String(error)}`);
      logger.error(`Failed to send email to ${user.email}:`, error);
    }
  }

  return NextResponse.json({
    sent,
    failed,
    total: targetUsers.length,
    ...(errors.length > 0 && { errors }),
  });
});
