import withAuthRequired from "@/shared/lib/auth/withAuthRequired";
import { createLogger } from "@/shared/lib/logger";
import { db } from "@/db";
import {
  users,
  budgets,
  budgetMembers,
  groups,
  categories,
} from "@/db/schema";
import { defaultGroups } from "@/db/schema/groups";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { capitalizeWords } from "@/shared/lib/utils";
import {
  validationError,
  internalError,
  successResponse,
  errorResponse,
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

    const displayName = capitalizeWords(
      user?.displayName || user?.name || "Usuário"
    );
    const firstName = displayName.split(" ")[0];

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

      // Ensure groups exist
      const existingGroups = await tx.select().from(groups);
      if (existingGroups.length === 0) {
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
      const allGroups = await tx.select().from(groups);

      // Check if categories already exist (avoid duplicates on re-setup)
      const existingCategories = await tx
        .select({ id: categories.id })
        .from(categories)
        .where(eq(categories.budgetId, budgetId))
        .limit(1);

      if (existingCategories.length === 0) {
        // Create categories from default template (all with plannedAmount = 0)
        for (const cat of template.categories) {
          const group = allGroups.find((g) => g.code === cat.groupCode);
          if (!group) continue;

          if (cat.isPersonal) {
            await tx.insert(categories).values({
              budgetId,
              groupId: group.id,
              memberId: ownerMemberId,
              name: `${cat.name} - ${firstName}`,
              icon: cat.icon,
              behavior: cat.behavior,
              plannedAmount: 0,
            });
          } else {
            await tx.insert(categories).values({
              budgetId,
              groupId: group.id,
              name: cat.name,
              icon: cat.icon,
              behavior: cat.behavior,
              plannedAmount: 0,
            });
          }
        }
      }

      return { budgetId };
    });

    logger.info(`Setup completed for user ${session.user.email}`, {
      budgetId: result.budgetId,
    });

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
