import withAuthRequired from "@/lib/auth/withAuthRequired";
import { db } from "@/db";
import { categories, budgetMembers, groups } from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { categoryBehaviorEnum } from "@/db/schema/categories";
import { capitalizeWords } from "@/lib/utils";

const createCategorySchema = z.object({
  budgetId: z.string().uuid(),
  groupId: z.string().uuid(),
  memberId: z.string().uuid().optional(), // For personal "Prazeres" categories
  name: z.string().min(1).max(100),
  icon: z.string().optional().nullable(),
  color: z.string().optional(),
  behavior: categoryBehaviorEnum.default("refill_up"),
  plannedAmount: z.number().int().default(0),
  targetAmount: z.number().int().optional(),
  targetDate: z.string().datetime().or(z.date()).optional(),
  suggestIcon: z.boolean().optional(), // If true, AI will suggest an emoji
});

// Simple emoji suggestion based on category name keywords
function suggestEmojiForCategory(name: string): string {
  const lowerName = name.toLowerCase();

  // Food & Drinks
  if (lowerName.includes("mercado") || lowerName.includes("supermercado") || lowerName.includes("feira")) return "🛒";
  if (lowerName.includes("restaurante") || lowerName.includes("comida") || lowerName.includes("almoço") || lowerName.includes("jantar")) return "🍽️";
  if (lowerName.includes("café") || lowerName.includes("coffee")) return "☕";
  if (lowerName.includes("padaria") || lowerName.includes("pão")) return "🥖";
  if (lowerName.includes("açougue") || lowerName.includes("carne")) return "🥩";
  if (lowerName.includes("delivery") || lowerName.includes("ifood")) return "🛵";
  if (lowerName.includes("bar") || lowerName.includes("cerveja") || lowerName.includes("bebida")) return "🍺";

  // Housing
  if (lowerName.includes("aluguel") || lowerName.includes("moradia")) return "🏠";
  if (lowerName.includes("condomínio") || lowerName.includes("condominio")) return "🏢";
  if (lowerName.includes("água") || lowerName.includes("agua")) return "💧";
  if (lowerName.includes("luz") || lowerName.includes("energia") || lowerName.includes("eletricidade")) return "💡";
  if (lowerName.includes("gás") || lowerName.includes("gas")) return "🔥";
  if (lowerName.includes("internet") || lowerName.includes("wifi")) return "📶";
  if (lowerName.includes("telefone") || lowerName.includes("celular")) return "📱";
  if (lowerName.includes("limpeza") || lowerName.includes("faxina")) return "🧹";
  if (lowerName.includes("móveis") || lowerName.includes("moveis") || lowerName.includes("decoração")) return "🛋️";

  // Transport
  if (lowerName.includes("uber") || lowerName.includes("99") || lowerName.includes("taxi") || lowerName.includes("corrida")) return "🚗";
  if (lowerName.includes("combustível") || lowerName.includes("combustivel") || lowerName.includes("gasolina") || lowerName.includes("etanol")) return "⛽";
  if (lowerName.includes("estacionamento")) return "🅿️";
  if (lowerName.includes("ônibus") || lowerName.includes("onibus") || lowerName.includes("metrô") || lowerName.includes("metro") || lowerName.includes("transporte")) return "🚌";
  if (lowerName.includes("ipva") || lowerName.includes("licenciamento") || lowerName.includes("seguro carro")) return "🚙";
  if (lowerName.includes("manutenção") || lowerName.includes("manutencao") || lowerName.includes("oficina") || lowerName.includes("mecânico")) return "🔧";

  // Health
  if (lowerName.includes("academia") || lowerName.includes("gym") || lowerName.includes("musculação")) return "💪";
  if (lowerName.includes("médico") || lowerName.includes("medico") || lowerName.includes("consulta") || lowerName.includes("saúde") || lowerName.includes("saude")) return "🏥";
  if (lowerName.includes("farmácia") || lowerName.includes("farmacia") || lowerName.includes("remédio") || lowerName.includes("remedio")) return "💊";
  if (lowerName.includes("dentista") || lowerName.includes("dente")) return "🦷";
  if (lowerName.includes("psicólogo") || lowerName.includes("psicologo") || lowerName.includes("terapia") || lowerName.includes("terapeuta")) return "🧠";
  if (lowerName.includes("plano de saúde") || lowerName.includes("plano saude")) return "🏥";

  // Entertainment
  if (lowerName.includes("netflix") || lowerName.includes("streaming") || lowerName.includes("hbo") || lowerName.includes("disney") || lowerName.includes("prime")) return "📺";
  if (lowerName.includes("spotify") || lowerName.includes("música") || lowerName.includes("musica") || lowerName.includes("deezer")) return "🎵";
  if (lowerName.includes("cinema") || lowerName.includes("filme")) return "🎬";
  if (lowerName.includes("teatro") || lowerName.includes("show") || lowerName.includes("evento")) return "🎭";
  if (lowerName.includes("viagem") || lowerName.includes("férias") || lowerName.includes("ferias") || lowerName.includes("passagem")) return "✈️";
  if (lowerName.includes("hotel") || lowerName.includes("hospedagem") || lowerName.includes("airbnb")) return "🏨";
  if (lowerName.includes("livro") || lowerName.includes("kindle") || lowerName.includes("leitura")) return "📚";
  if (lowerName.includes("jogo") || lowerName.includes("game") || lowerName.includes("playstation") || lowerName.includes("xbox")) return "🎮";

  // Shopping & Personal
  if (lowerName.includes("roupa") || lowerName.includes("vestuário") || lowerName.includes("vestuario") || lowerName.includes("moda")) return "👕";
  if (lowerName.includes("calçado") || lowerName.includes("calcado") || lowerName.includes("sapato") || lowerName.includes("tênis")) return "👟";
  if (lowerName.includes("beleza") || lowerName.includes("salão") || lowerName.includes("salao") || lowerName.includes("cabelo") || lowerName.includes("manicure")) return "💅";
  if (lowerName.includes("presente") || lowerName.includes("gift")) return "🎁";
  if (lowerName.includes("pet") || lowerName.includes("cachorro") || lowerName.includes("cão") || lowerName.includes("cao")) return "🐕";
  if (lowerName.includes("gato")) return "🐱";

  // Education
  if (lowerName.includes("escola") || lowerName.includes("faculdade") || lowerName.includes("curso") || lowerName.includes("educação") || lowerName.includes("educacao")) return "📖";
  if (lowerName.includes("material escolar") || lowerName.includes("papelaria")) return "✏️";
  if (lowerName.includes("inglês") || lowerName.includes("ingles") || lowerName.includes("idioma")) return "🌍";

  // Finance
  if (lowerName.includes("investimento") || lowerName.includes("poupança") || lowerName.includes("poupanca") || lowerName.includes("reserva")) return "💰";
  if (lowerName.includes("cartão") || lowerName.includes("cartao") || lowerName.includes("crédito") || lowerName.includes("credito")) return "💳";
  if (lowerName.includes("imposto") || lowerName.includes("ir") || lowerName.includes("iptu")) return "🧾";
  if (lowerName.includes("seguro")) return "🛡️";
  if (lowerName.includes("doação") || lowerName.includes("doacao") || lowerName.includes("caridade")) return "❤️";

  // Kids
  if (lowerName.includes("filho") || lowerName.includes("filha") || lowerName.includes("criança") || lowerName.includes("crianca") || lowerName.includes("bebê") || lowerName.includes("bebe")) return "👶";
  if (lowerName.includes("brinquedo")) return "🧸";
  if (lowerName.includes("fralda")) return "🍼";

  // Work
  if (lowerName.includes("trabalho") || lowerName.includes("office") || lowerName.includes("escritório") || lowerName.includes("escritorio")) return "💼";
  if (lowerName.includes("equipamento") || lowerName.includes("computador") || lowerName.includes("notebook")) return "💻";

  // Default
  return "📌";
}

// Helper to get user's budget IDs
async function getUserBudgetIds(userId: string) {
  const memberships = await db
    .select({ budgetId: budgetMembers.budgetId })
    .from(budgetMembers)
    .where(eq(budgetMembers.userId, userId));
  return memberships.map((m) => m.budgetId);
}

// GET - Get categories for user's budgets (with groups)
export const GET = withAuthRequired(async (req, context) => {
  const { session } = context;
  const { searchParams } = new URL(req.url);
  const budgetId = searchParams.get("budgetId");

  const budgetIds = await getUserBudgetIds(session.user.id);
  if (budgetIds.length === 0) {
    return NextResponse.json({ categories: [], groups: [] });
  }

  // Get all groups
  const allGroups = await db.select().from(groups).orderBy(groups.displayOrder);

  // Get categories with group info
  const userCategories = await db
    .select({
      category: categories,
      group: groups,
    })
    .from(categories)
    .innerJoin(groups, eq(categories.groupId, groups.id))
    .where(
      budgetId
        ? and(
            eq(categories.budgetId, budgetId),
            inArray(categories.budgetId, budgetIds),
            eq(categories.isArchived, false)
          )
        : and(
            inArray(categories.budgetId, budgetIds),
            eq(categories.isArchived, false)
          )
    )
    .orderBy(groups.displayOrder, categories.displayOrder);

  // Group categories by group
  const categoriesByGroup = allGroups.map((group) => ({
    ...group,
    categories: userCategories
      .filter((c) => c.group.id === group.id)
      .map((c) => c.category),
  }));

  return NextResponse.json(
    {
      groups: categoriesByGroup,
      flatCategories: userCategories.map((c) => ({
        ...c.category,
        group: c.group,
      })),
    },
    {
      // PERFORMANCE: Cache for 30 seconds, stale-while-revalidate for 5 minutes
      headers: {
        "Cache-Control": "private, max-age=30, stale-while-revalidate=300",
      },
    }
  );
});

// POST - Create a new category
export const POST = withAuthRequired(async (req, context) => {
  const { session } = context;
  const body = await req.json();

  const validation = createCategorySchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(
      { error: "Validation failed", details: validation.error.errors },
      { status: 400 }
    );
  }

  const { budgetId, targetDate, suggestIcon, ...categoryData } = validation.data;

  // Check user has access to budget
  const budgetIds = await getUserBudgetIds(session.user.id);
  if (!budgetIds.includes(budgetId)) {
    return NextResponse.json(
      { error: "Budget not found or access denied" },
      { status: 404 }
    );
  }

  // Determine icon: use provided, or suggest if requested, or default
  let finalIcon = categoryData.icon;
  if (!finalIcon && suggestIcon) {
    finalIcon = suggestEmojiForCategory(categoryData.name);
  }

  // Get display order
  const existingCategories = await db
    .select()
    .from(categories)
    .where(
      and(
        eq(categories.budgetId, budgetId),
        eq(categories.groupId, categoryData.groupId)
      )
    );

  const [newCategory] = await db
    .insert(categories)
    .values({
      ...categoryData,
      name: capitalizeWords(categoryData.name),
      icon: finalIcon,
      budgetId,
      targetDate: targetDate ? new Date(targetDate) : undefined,
      displayOrder: existingCategories.length,
    })
    .returning();

  return NextResponse.json({ category: newCategory }, { status: 201 });
});
