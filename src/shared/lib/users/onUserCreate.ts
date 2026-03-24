import { db } from "@/db";
import { plans } from "@/db/schema/plans";
import { users } from "@/db/schema/user";
import { budgets, budgetMembers } from "@/db/schema";
import { render } from "@react-email/components";
import { eq } from "drizzle-orm";
import { appConfig } from "../config";
import { capitalizeWords } from "../utils";
import Welcome from "@/emails/Welcome";
import WelcomeBeta from "@/emails/WelcomeBeta";
import sendMail from "../email/sendMail";
import { enableCredits, onRegisterCredits } from "../credits/config";
import { type CreditType } from "../credits/credits";
import { addCredits } from "../credits/recalculate";
import { addDays } from "date-fns";
import { createLogger } from "@/shared/lib/logger";

const logger = createLogger("onUserCreate");

const onUserCreate = async (newUser: {
  id: string;
  email: string | null;
  name?: string | null;
}) => {
  const defaultPlan = await db
    .select()
    .from(plans)
    .where(eq(plans.default, true))
    .limit(1);

  if (defaultPlan.length > 0) {
    await db
      .update(users)
      .set({ planId: defaultPlan[0].id })
      .where(eq(users.id, newUser.id));
  }

  // In waitlist mode, all new signups are beta testers
  if (appConfig.waitlistMode) {
    try {
      await db
        .update(users)
        .set({ role: "beta" })
        .where(eq(users.id, newUser.id));
      logger.info(`Beta tester role assigned to ${newUser.email}`);
    } catch (error) {
      logger.error("Error assigning beta tester role", error);
    }
  }

  // Create an empty budget so the user always has a budgetId
  try {
    const displayName = capitalizeWords(newUser.name || "");
    const budgetName = displayName
      ? `Orcamento de ${displayName}`
      : "Meu Orcamento";

    const [newBudget] = await db
      .insert(budgets)
      .values({ name: budgetName })
      .returning();

    await db.insert(budgetMembers).values({
      budgetId: newBudget.id,
      userId: newUser.id,
      name: displayName || "Eu",
      type: "owner",
      color: "#8b5cf6",
    });

    logger.info(`Empty budget created for user ${newUser.email}`);
  } catch (error) {
    logger.error("Error creating initial budget", error);
  }

  if (enableCredits) {
    // Add welcome credits based on configuration
    for (const [creditType, config] of Object.entries(onRegisterCredits)) {
      const expiryDate = config.expiryAfter
        ? addDays(new Date(), config.expiryAfter)
        : null;

      await addCredits(
        newUser.id,
        creditType as CreditType,
        config.amount,
        `welcome_credits_${creditType}_${newUser.id}`,
        {
          reason: "Welcome credits",
        },
        expiryDate
      );
    }
  }

  // Envia email de boas-vindas
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const userName = newUser.name || "Usuário";
  const dashboardUrl = `${baseUrl}/app`;

  if (appConfig.waitlistMode) {
    const html = await render(WelcomeBeta({ userName, dashboardUrl }));
    await sendMail(
      newUser.email!,
      `Bem-vindo ao time de beta testers do ${appConfig.projectName}!`,
      html
    );
  } else {
    const html = await render(Welcome({ userName, dashboardUrl }));
    await sendMail(
      newUser.email!,
      `Bem-vindo ao ${appConfig.projectName}!`,
      html
    );
  }
};

export default onUserCreate;
