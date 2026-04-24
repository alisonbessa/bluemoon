import withAuthRequired from "@/shared/lib/auth/withAuthRequired";
import { createLogger } from "@/shared/lib/logger";
import { track } from "@vercel/analytics/server";
import { db } from "@/db";
import {
  users,
  budgets,
  budgetMembers,
  groups,
  categories,
} from "@/db/schema";
import { defaultGroups } from "@/db/schema/groups";
import { eq, isNull, and } from "drizzle-orm";
import { z } from "zod";
import { capitalizeWords, getFirstName } from "@/shared/lib/utils";
import {
  validationError,
  internalError,
  successResponse,
} from "@/shared/lib/api/responses";
import { getDefaultTemplateForPlan } from "@/shared/lib/budget-templates";

const logger = createLogger("api:onboarding:setup");

const MEMBER_COLORS = [
  "#8b5cf6", // violet (owner)
  "#ec4899", // pink (partner)
];

const setupSchema = z.object({
  privacyMode: z.enum(["visible", "unified", "private"]).optional(),
});

/**
 * POST /api/app/onboarding/setup
 *
 * Creates a complete budget setup from the onboarding wizard:
 * - Budget with name
 * - Owner budget member
 * - Categories from template with planned amounts
 * - Income sources with real values
 * - Financial accounts
 * - Sets onboardingCompletedAt
 */
export const POST = withAuthRequired(async (request, context) => {
  const { session } = context;

  try {
    const body = await request.json();
    const data = setupSchema.parse(body);

    const userId = session.user.id;

    // Get user info
    const [user] = await db
      .select({ displayName: users.displayName, name: users.name })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    // Fallback to "Eu" matches the convention used by onUserCreate when no
    // name is available — keeps the budget owner label personal but neutral.
    const displayName =
      capitalizeWords(user?.displayName || user?.name || "") || "Eu";
    const firstName =
      getFirstName(user?.displayName) ?? getFirstName(user?.name) ?? "Eu";

    // Find existing budget (created on signup) or create one for legacy users
    let existingMembership = await db
      .select({ budgetId: budgetMembers.budgetId, memberId: budgetMembers.id })
      .from(budgetMembers)
      .where(eq(budgetMembers.userId, userId))
      .limit(1);

    if (!existingMembership.length) {
      // Legacy user without budget - create one now
      const [newBudget] = await db
        .insert(budgets)
        .values({ name: `Orcamento de ${displayName}` })
        .returning();

      const [newMember] = await db
        .insert(budgetMembers)
        .values({
          budgetId: newBudget.id,
          userId,
          name: displayName,
          type: "owner",
          color: "#8b5cf6",
        })
        .returning();

      existingMembership = [{ budgetId: newBudget.id, memberId: newMember.id }];
      logger.info(`Created budget for legacy user ${session.user.email}`);
    }

    const budgetId = existingMembership[0].budgetId;
    const ownerMemberId = existingMembership[0].memberId;

    // Use default template based on plan type
    const planCodename = existingMembership.length > 0 ? "solo" : "solo";
    const template = getDefaultTemplateForPlan(planCodename);

    const result = await db.transaction(async (tx) => {
      // Update user
      await tx
        .update(users)
        .set({
          displayName,
          onboardingCompletedAt: new Date(),
        })
        .where(eq(users.id, userId));

      // Update existing budget
      await tx
        .update(budgets)
        .set({
          name: `Orçamento de ${displayName}`,
          ...(data.privacyMode ? { privacyMode: data.privacyMode } : {}),
        })
        .where(eq(budgets.id, budgetId));

      // Update owner member name
      await tx
        .update(budgetMembers)
        .set({ name: displayName })
        .where(eq(budgetMembers.id, ownerMemberId));

      // Ensure global groups exist (seeded once globally)
      const existingGlobalGroups = await tx
        .select()
        .from(groups)
        .where(isNull(groups.budgetId));

      if (existingGlobalGroups.length === 0) {
        await tx.insert(groups).values(
          defaultGroups.map((g) => ({
            code: g.code,
            name: g.name,
            description: g.description,
            icon: g.icon,
            displayOrder: g.displayOrder,
          }))
        );
      }
      const allGlobalGroups = await tx
        .select()
        .from(groups)
        .where(isNull(groups.budgetId));

      // Create personal group for the owner member (if it doesn't exist yet)
      const existingPersonalGroup = await tx
        .select({ id: groups.id })
        .from(groups)
        .where(and(eq(groups.budgetId, budgetId), eq(groups.memberId, ownerMemberId)))
        .limit(1);

      let ownerPersonalGroupId: string;
      if (existingPersonalGroup.length > 0) {
        ownerPersonalGroupId = existingPersonalGroup[0].id;
      } else {
        const [personalGroup] = await tx
          .insert(groups)
          .values({
            budgetId,
            memberId: ownerMemberId,
            code: null,
            name: `Gastos de ${firstName}`,
            description: `Gastos pessoais de ${firstName}`,
            icon: "✨",
            displayOrder: 10, // after global groups (1–4)
          })
          .returning();
        ownerPersonalGroupId = personalGroup.id;
      }

      // Check if categories already exist (avoid duplicates on re-setup)
      const existingCategories = await tx
        .select({ id: categories.id })
        .from(categories)
        .where(eq(categories.budgetId, budgetId))
        .limit(1);

      if (existingCategories.length === 0) {
        // Create shared categories from default template
        for (const cat of template.categories) {
          const group = allGlobalGroups.find((g) => g.code === cat.groupCode);
          if (!group) continue;

          await tx.insert(categories).values({
            budgetId,
            groupId: group.id,
            name: cat.name,
            icon: cat.icon,
            behavior: cat.behavior,
            plannedAmount: 0,
          });
        }

        // Create a default category inside the owner's personal group
        await tx.insert(categories).values({
          budgetId,
          groupId: ownerPersonalGroupId,
          memberId: ownerMemberId,
          name: `Gastos de ${firstName}`,
          icon: "✨",
          behavior: "refill_up",
          plannedAmount: 0,
        });
      }

      return { budgetId };
    });

    logger.info(`Setup completed for user ${session.user.email}`, {
      budgetId: result.budgetId,
    });

    track("onboarding_completed", {
      hasPrivacyMode: Boolean(data.privacyMode),
      privacyMode: data.privacyMode ?? null,
    }).catch(() => {});

    return successResponse({
      success: true,
      budgetId: result.budgetId,
    });
  } catch (error) {
    logger.error("Error in setup endpoint:", error);

    if (error instanceof z.ZodError) {
      return validationError(error);
    }

    return internalError("Erro ao configurar orçamento");
  }
});
