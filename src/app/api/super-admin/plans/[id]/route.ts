import { NextResponse } from "next/server";
import withSuperAdminAuthRequired from "@/shared/lib/auth/withSuperAdminAuthRequired";
import { db } from "@/db";
import { plans } from "@/db/schema/plans";
import { users } from "@/db/schema/user";
import { eq, count } from "drizzle-orm";

export const GET = withSuperAdminAuthRequired(async (req, context) => {
  const { id } = await context.params as { id: string };
  try {
    const plan = await db
      .select()
      .from(plans)
      .where(eq(plans.id, id))
      .limit(1);

    if (!plan[0]) {
      return NextResponse.json({ error: "Plan not found" }, { status: 404 });
    }

    return NextResponse.json(plan[0]);
  } catch (error) {
    console.error("Error fetching plan:", error);
    return NextResponse.json(
      { error: "Failed to fetch plan" },
      { status: 500 }
    );
  }
});

export const DELETE = withSuperAdminAuthRequired(async (req, context) => {
  const { id } = await context.params as { id: string };

  try {
    // Check if plan exists
    const [plan] = await db
      .select()
      .from(plans)
      .where(eq(plans.id, id))
      .limit(1);

    if (!plan) {
      return NextResponse.json({ error: "Plano não encontrado" }, { status: 404 });
    }

    // Cannot delete default plan
    if (plan.default) {
      return NextResponse.json(
        { error: "Não é possível excluir o plano padrão. Defina outro plano como padrão primeiro." },
        { status: 400 }
      );
    }

    // Check if there are users with this plan
    const [usersCount] = await db
      .select({ count: count() })
      .from(users)
      .where(eq(users.planId, id));

    if (usersCount && usersCount.count > 0) {
      return NextResponse.json(
        { error: `Não é possível excluir. Existem ${usersCount.count} usuário(s) com este plano.` },
        { status: 400 }
      );
    }

    // Delete the plan
    await db.delete(plans).where(eq(plans.id, id));

    return NextResponse.json({ success: true, message: "Plano excluído com sucesso" });
  } catch (error) {
    console.error("Error deleting plan:", error);
    return NextResponse.json(
      { error: "Erro ao excluir plano" },
      { status: 500 }
    );
  }
});
