import withAuthRequired from "@/lib/auth/withAuthRequired";
import { db } from "@/db";
import { users, budgets, budgetMembers, groups, categories, incomeSources, financialAccounts } from "@/db/schema";
import { defaultGroups } from "@/db/schema/groups";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { capitalizeWords } from "@/lib/utils";

// Default categories to create for new budgets
const DEFAULT_CATEGORIES = [
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
] as const;

const welcomeSchema = z.object({
  displayName: z.string().min(1),
  household: z.array(
    z.object({
      type: z.enum(["partner", "child", "adult", "pet"]),
      count: z.number().min(1).max(10),
    })
  ),
});

// Member colors for household members
const MEMBER_COLORS = [
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#f97316", // orange
  "#22c55e", // green
  "#3b82f6", // blue
  "#eab308", // yellow
  "#14b8a6", // teal
  "#ef4444", // red
  "#a855f7", // purple
  "#06b6d4", // cyan
];

export const POST = withAuthRequired(async (request, context) => {
  const { session } = context;

  try {
    const body = await request.json();
    const { displayName, household } = welcomeSchema.parse(body);

    const userId = session.user.id;
    const formattedName = capitalizeWords(displayName);

    // Check if user already has a budget (via budget member with userId)
    const existingMembership = await db
      .select({ budgetId: budgetMembers.budgetId })
      .from(budgetMembers)
      .where(eq(budgetMembers.userId, userId))
      .limit(1);

    if (existingMembership.length > 0) {
      // User already has a budget, just update display name
      await db
        .update(users)
        .set({ displayName: formattedName })
        .where(eq(users.id, userId));

      return NextResponse.json({ success: true, budgetId: existingMembership[0].budgetId });
    }

    // Create budget and members in a transaction
    const result = await db.transaction(async (tx) => {
      // Update user display name
      await tx
        .update(users)
        .set({ displayName: formattedName })
        .where(eq(users.id, userId));

      // Create budget
      const [newBudget] = await tx
        .insert(budgets)
        .values({
          name: `Orçamento De ${formattedName}`,
        })
        .returning();

      // Ensure groups exist (seed if needed) - groups are global, not per-budget
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

      // Get all groups for creating default categories
      const allGroups = await tx.select().from(groups);

      // Create default categories for the budget
      const categoryInserts = DEFAULT_CATEGORIES.map((cat) => {
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

      await tx.insert(categories).values(categoryInserts);

      // Create owner member (the user themselves)
      const [ownerMember] = await tx.insert(budgetMembers).values({
        budgetId: newBudget.id,
        userId: userId,
        name: formattedName,
        type: "owner",
        color: MEMBER_COLORS[0],
      }).returning();

      // Create default income sources
      await tx.insert(incomeSources).values([
        {
          budgetId: newBudget.id,
          memberId: ownerMember.id,
          name: "Salário",
          type: "salary",
          amount: 0,
          frequency: "monthly",
          dayOfMonth: 5,
          displayOrder: 0,
        },
        {
          budgetId: newBudget.id,
          memberId: ownerMember.id,
          name: "Vale Refeição",
          type: "benefit",
          amount: 0,
          frequency: "monthly",
          dayOfMonth: 1,
          displayOrder: 1,
        },
      ]);

      // Create default financial account (checking) so Telegram can work immediately
      await tx.insert(financialAccounts).values({
        budgetId: newBudget.id,
        name: "Conta Corrente",
        type: "checking",
        balance: 0,
        displayOrder: 0,
      });

      // Create household members
      let colorIndex = 1;

      for (const member of household) {
        const count = member.count;

        for (let i = 0; i < count; i++) {
          let name: string;
          // Map "adult" to "partner" since schema doesn't have "adult" type
          let type: "partner" | "child" | "pet";

          switch (member.type) {
            case "partner":
              name = "Parceiro(a)";
              type = "partner";
              break;
            case "child":
              name = count > 1 ? `Filho(a) ${i + 1}` : "Filho(a)";
              type = "child";
              break;
            case "adult":
              name = count > 1 ? `Adulto ${i + 1}` : "Outro Adulto";
              type = "partner"; // Map adult to partner in DB
              break;
            case "pet":
              name = count > 1 ? `Pet ${i + 1}` : "Pet";
              type = "pet";
              break;
          }

          await tx.insert(budgetMembers).values({
            budgetId: newBudget.id,
            name,
            type,
            color: MEMBER_COLORS[colorIndex % MEMBER_COLORS.length],
          });

          colorIndex++;
        }
      }

      return { budgetId: newBudget.id };
    });

    return NextResponse.json({ success: true, budgetId: result.budgetId });
  } catch (error) {
    console.error("Error in welcome endpoint:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Dados inválidos", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Erro ao processar boas-vindas" },
      { status: 500 }
    );
  }
});
