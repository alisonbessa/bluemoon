import withAuthRequired from "@/lib/auth/withAuthRequired";
import { db } from "@/db";
import { users, budgets, budgetMembers } from "@/db/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { capitalizeWords } from "@/lib/utils";

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

      // Note: Groups are global (seeded data), not per-budget
      // Categories link to groups via groupId

      // Create owner member (the user themselves)
      await tx.insert(budgetMembers).values({
        budgetId: newBudget.id,
        userId: userId,
        name: formattedName,
        type: "owner",
        color: MEMBER_COLORS[0],
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
