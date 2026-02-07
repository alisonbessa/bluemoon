import { inngest } from "../client";
import { db } from "@/db";
import { invites } from "@/db/schema/invites";
import { users } from "@/db/schema/user";
import { budgets } from "@/db/schema/budgets";
import { and, eq, gt, isNotNull, isNull, lt } from "drizzle-orm";
import sendMail from "@/shared/lib/email/sendMail";
import { render } from "@react-email/render";
import InviteReminder from "@/emails/InviteReminder";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { createLogger } from "@/shared/lib/logger";

const logger = createLogger("inngest:invite-reminders");

const appUrl = process.env.NEXT_PUBLIC_APP_URL;
if (!appUrl) {
  logger.warn("NEXT_PUBLIC_APP_URL not set, using localhost fallback");
}
const baseUrl = appUrl || "http://localhost:3000";

/**
 * Sends reminders to users who have pending invites that haven't been accepted
 * Runs every 6 hours
 * Only sends reminder once per invite (24h after creation)
 */
export const sendInviteReminders = inngest.createFunction(
  {
    id: "send-invite-reminders",
    name: "Send Invite Reminders",
  },
  { cron: "0 */6 * * *" }, // Every 6 hours
  async ({ step }) => {
    const now = new Date();

    // Get invites that are:
    // - Still pending
    // - Created more than 24h ago
    // - Haven't had a reminder sent yet
    // - Not expired
    const twentyFourHoursAgo = new Date(now);
    twentyFourHoursAgo.setHours(now.getHours() - 24);

    const pendingInvites = await step.run("fetch-pending-invites", async () => {
      return db
        .select({
          inviteId: invites.id,
          inviteEmail: invites.email,
          inviteToken: invites.token,
          expiresAt: invites.expiresAt,
          budgetId: invites.budgetId,
          budgetName: budgets.name,
          invitedByUserId: invites.invitedByUserId,
          invitedByName: users.name,
          invitedByEmail: users.email,
        })
        .from(invites)
        .innerJoin(budgets, eq(invites.budgetId, budgets.id))
        .innerJoin(users, eq(invites.invitedByUserId, users.id))
        .where(
          and(
            eq(invites.status, "pending"),
            lt(invites.createdAt, twentyFourHoursAgo),
            isNull(invites.reminderSentAt),
            gt(invites.expiresAt, now),
            isNotNull(users.email)
          )
        );
    });

    let sent = 0;
    let errors = 0;

    for (const invite of pendingInvites) {
      if (!invite.invitedByEmail) continue;

      try {
        const expiresIn = formatDistanceToNow(invite.expiresAt, {
          locale: ptBR,
          addSuffix: false,
        });

        const emailHtml = await render(
          InviteReminder({
            userName: invite.invitedByName || "Usuário",
            partnerEmail: invite.inviteEmail || "seu parceiro(a)",
            budgetName: invite.budgetName,
            inviteUrl: `${baseUrl}/app/settings`,
            expiresIn,
          })
        );

        await step.run(`send-invite-reminder-${invite.inviteId}`, async () => {
          await sendMail(
            invite.invitedByEmail!,
            "Seu convite ainda não foi aceito",
            emailHtml
          );
        });

        // Mark reminder as sent
        await step.run(`mark-reminder-sent-${invite.inviteId}`, async () => {
          await db
            .update(invites)
            .set({ reminderSentAt: now })
            .where(eq(invites.id, invite.inviteId));
        });

        sent++;
      } catch (error) {
        logger.error(`Failed to send invite reminder for ${invite.inviteId}`, error);
        errors++;
      }
    }

    return {
      sent,
      errors,
      totalProcessed: pendingInvites.length,
    };
  }
);
