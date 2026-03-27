import withAuthRequired from "@/shared/lib/auth/withAuthRequired";
import { createLogger } from "@/shared/lib/logger";
import { db } from "@/db";
import {
  users,
  budgets,
  budgetMembers,
  groups,
  categories,
  incomeSources,
  financialAccounts,
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
import { getTemplateByCodename } from "@/shared/lib/budget-templates";

const logger = createLogger("api:onboarding:setup");

const MEMBER_COLORS = [
  "#8b5cf6", // violet (owner)
  "#ec4899", // pink (partner)
];

const setupSchema = z.object({
  templateCodename: z.string().min(1),
  income: z.object({
    sources: z
      .array(
        z.object({
          name: z.string().min(1),
          amount: z.number().min(0), // in cents
          type: z.enum([
            "salary",
            "benefit",
            "freelance",
            "rental",
            "investment",
            "other",
          ]),
          isPartner: z.boolean().optional(),
        })
      )
      .min(1),
  }),
  accounts: z
    .array(
      z.object({
        name: z.string().min(1),
        type: z.enum([
          "checking",
          "savings",
          "credit_card",
          "cash",
          "investment",
          "benefit",
        ]),
        closingDay: z.number().min(1).max(31).optional(),
        dueDay: z.number().min(1).max(31).optional(),
      })
    )
    .min(1),
  partnerEmail: z.string().email().optional(),
  privacyMode: z.enum(["visible", "unified", "private"]).optional(),
  categoryOverrides: z
    .array(
      z.object({
        name: z.string(),
        plannedAmount: z.number().min(0),
      })
    )
    .optional(),
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

    // Get template
    const template = getTemplateByCodename(data.templateCodename);
    if (!template) {
      return errorResponse("Template nao encontrado", 404);
    }

    // Calculate total income
    const totalIncomeCents = data.income.sources.reduce(
      (sum, s) => sum + s.amount,
      0
    );

    // Build category overrides map
    const overridesMap = new Map(
      (data.categoryOverrides ?? []).map((o) => [o.name, o.plannedAmount])
    );

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
          name: `Orcamento de ${displayName}`,
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

      // Create categories from template
      for (const cat of template.categories) {
        const group = allGroups.find((g) => g.code === cat.groupCode);
        if (!group) continue;

        const defaultAmount = Math.round(totalIncomeCents * cat.percentage);
        const plannedAmount = overridesMap.get(cat.name) ?? defaultAmount;

        if (cat.isPersonal) {
          await tx.insert(categories).values({
            budgetId,
            groupId: group.id,
            memberId: ownerMemberId,
            name: `${cat.name} - ${firstName}`,
            icon: cat.icon,
            behavior: cat.behavior,
            plannedAmount,
          });
        } else {
          await tx.insert(categories).values({
            budgetId,
            groupId: group.id,
            name: cat.name,
            icon: cat.icon,
            behavior: cat.behavior,
            plannedAmount,
          });
        }
      }

      // Create income sources
      // Partner income sources get memberId = null (shared) until the partner
      // joins and gets their own memberId assigned
      for (let i = 0; i < data.income.sources.length; i++) {
        const source = data.income.sources[i];
        await tx.insert(incomeSources).values({
          budgetId,
          memberId: source.isPartner ? null : ownerMemberId,
          name: source.name,
          type: source.type,
          amount: source.amount,
          frequency: "monthly",
          dayOfMonth: 5,
          displayOrder: i,
        });
      }

      // Create financial accounts
      for (let i = 0; i < data.accounts.length; i++) {
        const account = data.accounts[i];
        await tx.insert(financialAccounts).values({
          budgetId,
          ownerId: ownerMemberId,
          name: account.name,
          type: account.type,
          balance: 0,
          closingDay: account.closingDay,
          dueDay: account.dueDay,
          displayOrder: i,
        });
      }

      return { budgetId };
    });

    logger.info(`Setup completed for user ${session.user.email}`, {
      budgetId: result.budgetId,
      template: data.templateCodename,
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
