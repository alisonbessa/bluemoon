import withAuthRequired from "@/shared/lib/auth/withAuthRequired";
import { db } from "@/db";
import { budgetMembers, categories, groups, plans, users } from "@/db/schema";
import { eq, and, inArray, count } from "drizzle-orm";
import { capitalizeWords } from "@/shared/lib/utils";
import { getUserBudgetMemberships } from "@/shared/lib/api/permissions";
import {
  validationError,
  forbiddenError,
  notFoundError,
  successResponse,
  errorResponse,
} from "@/shared/lib/api/responses";
import { createMemberSchema } from "@/shared/lib/validations";
import { defaultQuotas } from "@/db/schema/plans";
import { recordAuditLog } from "@/shared/lib/security/audit-log";

// GET - Get members for user's budgets
export const GET = withAuthRequired(async (req, context) => {
  const { session } = context;
  const { searchParams } = new URL(req.url);
  const budgetId = searchParams.get("budgetId");

  const memberships = await getUserBudgetMemberships(session.user.id);
  const budgetIds = memberships.map((m) => m.budgetId);

  if (budgetIds.length === 0) {
    return successResponse({ members: [] });
  }

  const members = await db
    .select()
    .from(budgetMembers)
    .where(
      budgetId
        ? and(
            eq(budgetMembers.budgetId, budgetId),
            inArray(budgetMembers.budgetId, budgetIds)
          )
        : inArray(budgetMembers.budgetId, budgetIds)
    );

  // Strip privacyLevel from other members to prevent data leakage
  const sanitizedMembers = members.map((m) => ({
    ...m,
    privacyLevel: m.userId === session.user.id ? m.privacyLevel : undefined,
  }));

  return successResponse({ members: sanitizedMembers });
});

// POST - Add a dependent (child/pet) to budget
export const POST = withAuthRequired(async (req, context) => {
  const { session } = context;
  const body = await req.json();

  const validation = createMemberSchema.safeParse(body);
  if (!validation.success) {
    return validationError(validation.error);
  }

  const { budgetId, name, type, color, monthlyPleasureBudget } = validation.data;

  // Check user is owner or partner of the budget
  const memberships = await getUserBudgetMemberships(session.user.id);
  const membership = memberships.find((m) => m.budgetId === budgetId);

  if (!membership) {
    return notFoundError("Budget");
  }

  if (membership.type !== "owner" && membership.type !== "partner") {
    return forbiddenError("Only owner or partner can add members");
  }

  // Enforce plan quota for dependents (children/pets).
  const [owner] = await db
    .select({ planId: users.planId })
    .from(budgetMembers)
    .innerJoin(users, eq(budgetMembers.userId, users.id))
    .where(
      and(eq(budgetMembers.budgetId, budgetId), eq(budgetMembers.type, "owner"))
    )
    .limit(1);

  const ownerPlan = owner?.planId
    ? (
        await db
          .select({ quotas: plans.quotas })
          .from(plans)
          .where(eq(plans.id, owner.planId))
          .limit(1)
      )[0]
    : undefined;

  const maxDependents =
    ownerPlan?.quotas?.maxDependents ?? defaultQuotas.maxDependents;

  const [{ total }] = await db
    .select({ total: count() })
    .from(budgetMembers)
    .where(
      and(
        eq(budgetMembers.budgetId, budgetId),
        inArray(budgetMembers.type, ["child", "pet"])
      )
    );

  if (total >= maxDependents) {
    return errorResponse(
      `Limite de ${maxDependents} dependentes atingido neste orçamento. Faça upgrade do plano para adicionar mais.`,
      402
    );
  }

  const capitalizedName = capitalizeWords(name);

  // Create the dependent member (no userId)
  const [newMember] = await db
    .insert(budgetMembers)
    .values({
      budgetId,
      name: capitalizedName,
      type,
      color,
      monthlyPleasureBudget,
      userId: null, // Dependents don't have user accounts
    })
    .returning();

  // Create a "Prazeres" category for this member
  const pleasuresGroup = await db
    .select()
    .from(groups)
    .where(eq(groups.code, "pleasures"))
    .limit(1);

  if (pleasuresGroup.length > 0) {
    await db.insert(categories).values({
      budgetId,
      groupId: pleasuresGroup[0].id,
      memberId: newMember.id,
      name: `Prazeres - ${capitalizedName}`,
      icon: type === "pet" ? "🐾" : "🎮",
      behavior: "refill_up",
      plannedAmount: monthlyPleasureBudget,
    });
  }

  await recordAuditLog({
    userId: session.user.id,
    action: "member.create",
    resource: "budget_member",
    resourceId: newMember.id,
    details: { budgetId, type, name: capitalizedName },
    req,
  });

  return successResponse({ member: newMember }, 201);
});
