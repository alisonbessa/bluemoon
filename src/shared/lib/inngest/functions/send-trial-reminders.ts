import { inngest } from "../client";
import { db } from "@/db";
import { users } from "@/db/schema/user";
import { plans } from "@/db/schema/plans";
import { and, between, eq, isNotNull, isNull, or } from "drizzle-orm";
import sendMail from "@/shared/lib/email/sendMail";
import { render } from "@react-email/render";
import TrialReminder7Days from "@/emails/TrialReminder7Days";
import TrialReminder2Days from "@/emails/TrialReminder2Days";

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

/**
 * Sends trial reminder emails to users whose trial is ending
 * Runs daily at 10:00 AM (UTC-3 = Brasilia time)
 * Sends D-7 reminders and D-2 reminders
 */
export const sendTrialReminders = inngest.createFunction(
  {
    id: "send-trial-reminders",
    name: "Send Trial Reminders",
  },
  { cron: "0 13 * * *" }, // Every day at 13:00 UTC = 10:00 AM Brasilia
  async ({ step }) => {
    const now = new Date();

    // Calculate target dates for D-7 and D-2
    const sevenDaysFromNow = new Date(now);
    sevenDaysFromNow.setDate(now.getDate() + 7);
    sevenDaysFromNow.setHours(0, 0, 0, 0);

    const sevenDaysFromNowEnd = new Date(sevenDaysFromNow);
    sevenDaysFromNowEnd.setHours(23, 59, 59, 999);

    const twoDaysFromNow = new Date(now);
    twoDaysFromNow.setDate(now.getDate() + 2);
    twoDaysFromNow.setHours(0, 0, 0, 0);

    const twoDaysFromNowEnd = new Date(twoDaysFromNow);
    twoDaysFromNowEnd.setHours(23, 59, 59, 999);

    // Get users with trial ending in 7 days
    const usersEndingIn7Days = await step.run("fetch-users-7-days", async () => {
      return db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
          trialEndsAt: users.trialEndsAt,
          planId: users.planId,
        })
        .from(users)
        .where(
          and(
            isNotNull(users.trialEndsAt),
            between(users.trialEndsAt, sevenDaysFromNow, sevenDaysFromNowEnd),
            isNotNull(users.email),
            // Only users with active subscription (role is user or null)
            or(eq(users.role, "user"), isNull(users.role))
          )
        );
    });

    // Get users with trial ending in 2 days
    const usersEndingIn2Days = await step.run("fetch-users-2-days", async () => {
      return db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
          trialEndsAt: users.trialEndsAt,
          planId: users.planId,
        })
        .from(users)
        .where(
          and(
            isNotNull(users.trialEndsAt),
            between(users.trialEndsAt, twoDaysFromNow, twoDaysFromNowEnd),
            isNotNull(users.email),
            or(eq(users.role, "user"), isNull(users.role))
          )
        );
    });

    let sent7Days = 0;
    let sent2Days = 0;
    let errors = 0;

    // Send D-7 reminders
    for (const user of usersEndingIn7Days) {
      if (!user.email) continue;

      try {
        const trialEndDate = new Date(user.trialEndsAt!).toLocaleDateString("pt-BR", {
          day: "2-digit",
          month: "long",
        });

        const emailHtml = await render(
          TrialReminder7Days({
            userName: user.name || "Usuário",
            trialEndDate,
            settingsUrl: `${baseUrl}/app/settings`,
          })
        );

        await step.run(`send-7-day-reminder-${user.id}`, async () => {
          await sendMail(
            user.email!,
            "Seu trial termina em 7 dias",
            emailHtml
          );
        });

        sent7Days++;
      } catch (error) {
        console.error(`Failed to send D-7 reminder to ${user.email}:`, error);
        errors++;
      }
    }

    // Send D-2 reminders
    for (const user of usersEndingIn2Days) {
      if (!user.email) continue;

      try {
        // Get plan details for pricing info
        let planName = "Plano";
        let planPrice = "R$ 0,00";

        if (user.planId) {
          const [plan] = await db
            .select()
            .from(plans)
            .where(eq(plans.id, user.planId))
            .limit(1);

          if (plan) {
            planName = plan.name || "Plano";
            const price = plan.monthlyPrice || plan.yearlyPrice || 0;
            planPrice = `R$ ${(price / 100).toFixed(2).replace(".", ",")}`;
          }
        }

        const trialEndDate = new Date(user.trialEndsAt!).toLocaleDateString("pt-BR", {
          day: "2-digit",
          month: "long",
        });

        const emailHtml = await render(
          TrialReminder2Days({
            userName: user.name || "Usuário",
            trialEndDate,
            settingsUrl: `${baseUrl}/app/settings`,
            planName,
            planPrice,
          })
        );

        await step.run(`send-2-day-reminder-${user.id}`, async () => {
          await sendMail(
            user.email!,
            "Faltam 2 dias para o trial acabar",
            emailHtml
          );
        });

        sent2Days++;
      } catch (error) {
        console.error(`Failed to send D-2 reminder to ${user.email}:`, error);
        errors++;
      }
    }

    return {
      sent7Days,
      sent2Days,
      errors,
      totalProcessed: usersEndingIn7Days.length + usersEndingIn2Days.length,
    };
  }
);
