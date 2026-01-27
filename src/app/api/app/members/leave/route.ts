import withAuthRequired from "@/shared/lib/auth/withAuthRequired";
import { db } from "@/db";
import { budgetMembers } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import {
  validationError,
  forbiddenError,
  successResponse,
} from "@/shared/lib/api/responses";

const leaveBudgetSchema = z.object({
  budgetId: z.string().uuid(),
});

// POST - Partner leaves a budget voluntarily
export const POST = withAuthRequired(async (req, context) => {
  const { session } = context;
  const body = await req.json();

  const validation = leaveBudgetSchema.safeParse(body);
  if (!validation.success) {
    return validationError(validation.error);
  }

  const { budgetId } = validation.data;

  // Find user's membership in this budget
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
    return forbiddenError("Você não é membro deste orçamento");
  }

  // Only partners can leave - owners cannot abandon their budget
  if (membership.type === "owner") {
    return forbiddenError(
      "Você é o dono deste orçamento e não pode sair. Se deseja excluir o orçamento, use a opção de exclusão nas configurações."
    );
  }

  // Only partners with userId (real users) can use this endpoint
  if (membership.type !== "partner") {
    return forbiddenError("Apenas parceiros podem sair do orçamento");
  }

  // Delete the membership (cascade will handle categories)
  await db.delete(budgetMembers).where(eq(budgetMembers.id, membership.id));

  return successResponse({
    success: true,
    message: "Você saiu do orçamento com sucesso",
  });
});
