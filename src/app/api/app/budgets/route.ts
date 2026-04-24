import withAuthRequired from "@/shared/lib/auth/withAuthRequired";
import { db } from "@/db";
import { budgets, budgetMembers, groups, categories, defaultGroups } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { track } from "@vercel/analytics/server";
import { capitalizeWords } from "@/shared/lib/utils";
import {
  validationError,
  successResponse,
} from "@/shared/lib/api/responses";
import { createBudgetSchema } from "@/shared/lib/validations";
import { recordAuditLog } from "@/shared/lib/security/audit-log";

// GET - Get user's budgets (where they are a member)
export const GET = withAuthRequired(async (req, context) => {
  const { session } = context;

  const userBudgets = await db
    .select({
      id: budgets.id,
      name: budgets.name,
      description: budgets.description,
      currency: budgets.currency,
      privacyMode: budgets.privacyMode,
      createdAt: budgets.createdAt,
      memberType: budgetMembers.type,
    })
    .from(budgetMembers)
    .innerJoin(budgets, eq(budgetMembers.budgetId, budgets.id))
    .where(eq(budgetMembers.userId, session.user.id));

  return successResponse({ budgets: userBudgets });
});

// POST - Create a new budget
export const POST = withAuthRequired(async (req, context) => {
  const { session, getUser } = context;
  const body = await req.json();

  const validation = createBudgetSchema.safeParse(body);
  if (!validation.success) {
    return validationError(validation.error);
  }

  const { name, description, currency } = validation.data;
  const user = await getUser();

  // Create budget
  const [newBudget] = await db
    .insert(budgets)
    .values({
      name: capitalizeWords(name),
      description,
      currency,
    })
    .returning();

  // Create owner membership
  await db.insert(budgetMembers).values({
    budgetId: newBudget.id,
    userId: session.user.id,
    name: user?.name || "Owner",
    type: "owner",
  });

  // Ensure groups exist (seed if needed)
  const existingGroups = await db.select().from(groups);

  if (existingGroups.length === 0) {
    await db.insert(groups).values(
      defaultGroups.map((g) => ({
        code: g.code,
        name: g.name,
        description: g.description,
        icon: g.icon,
        displayOrder: g.displayOrder,
      }))
    );
  }

  // Get all groups for creating default categories
  const allGroups = await db.select().from(groups);

  // Create default categories for the budget
  const defaultCategories = [
    // Essencial
    { groupCode: "essential", name: "Moradia", icon: "🏠" },
    { groupCode: "essential", name: "Contas de Casa", icon: "💡" },
    { groupCode: "essential", name: "Mercado", icon: "🛒" },
    { groupCode: "essential", name: "Transporte", icon: "🚗" },
    { groupCode: "essential", name: "Saúde", icon: "💊" },
    // Estilo de Vida
    { groupCode: "lifestyle", name: "Alimentação Fora", icon: "🍽️" },
    { groupCode: "lifestyle", name: "Vestuário", icon: "👕" },
    { groupCode: "lifestyle", name: "Streaming", icon: "📺" },
    { groupCode: "lifestyle", name: "Academia", icon: "💪" },
    // Investimentos
    { groupCode: "investments", name: "Reserva de Emergência", icon: "🏦" },
    { groupCode: "investments", name: "Poupança", icon: "🐷" },
    // Metas
    { groupCode: "goals", name: "Viagem", icon: "✈️" },
  ];

  const categoryInserts = defaultCategories.map((cat) => {
    const group = allGroups.find((g) => g.code === cat.groupCode);
    return {
      budgetId: newBudget.id,
      groupId: group!.id,
      name: cat.name,
      icon: cat.icon,
      behavior: "refill_up" as const,
      plannedAmount: 0,
    };
  });

  await db.insert(categories).values(categoryInserts);

  void recordAuditLog({
    userId: session.user.id,
    action: "budget.create",
    resource: "budget",
    resourceId: newBudget.id,
    req,
  });

  // Fire-and-forget analytics: count user's budgets to detect activation moment.
  (async () => {
    try {
      const [{ count }] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(budgetMembers)
        .where(eq(budgetMembers.userId, session.user.id));
      await track("budget_created", { currency: currency ?? null });
      if (count === 1) {
        await track("first_budget_created", { currency: currency ?? null });
      }
    } catch {
      /* non-blocking */
    }
  })();

  return successResponse({ budget: newBudget }, 201);
});
