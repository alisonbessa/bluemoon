import withAuthRequired from "@/lib/auth/withAuthRequired";
import { db } from "@/db";
import {
  users,
  budgets,
  budgetMembers,
  groups,
  categories,
  financialAccounts,
  defaultGroups,
} from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { capitalizeWords } from "@/lib/utils";

const householdSchema = z.object({
  hasPartner: z.boolean(),
  partnerName: z.string(),
  children: z.array(z.string()), // Unified children array (was kids + teens)
  otherAdults: z.array(z.string()),
  pets: z.array(z.string()),
});

const onboardingSchema = z.object({
  data: z.object({
    displayName: z.string().min(1),
    household: householdSchema,
    housing: z.enum(["rent", "mortgage", "owned", "free"]).nullable(),
    transport: z.array(
      z.enum(["car", "motorcycle", "public", "apps", "bike", "walk"])
    ),
    accounts: z.array(
      z.enum(["checking", "credit_card", "vr", "va", "cash", "investment"])
    ),
    expenses: z.object({
      essential: z.array(z.string()),
      lifestyle: z.array(z.string()),
      utilitiesDetailed: z.boolean().optional(),
      utilitiesItems: z.array(z.string()).optional(),
    }),
    debts: z.array(z.string()),
    goals: z.array(z.string()),
    customGoal: z.string(),
  }),
});

// Category mapping based on onboarding selections
const HOUSING_CATEGORIES: Record<string, { name: string; icon: string }> = {
  rent: { name: "Aluguel", icon: "🏠" },
  mortgage: { name: "Financiamento Imóvel", icon: "🏡" },
};

const TRANSPORT_CATEGORIES: Record<string, { name: string; icon: string }> = {
  car: { name: "Carro (Combustível/Manutenção)", icon: "🚗" },
  motorcycle: { name: "Moto (Combustível/Manutenção)", icon: "🏍️" },
  public: { name: "Transporte Público", icon: "🚌" },
  apps: { name: "Apps de Transporte", icon: "📱" },
  bike: { name: "Bicicleta", icon: "🚴" },
};

const EXPENSE_CATEGORIES: Record<
  string,
  { name: string; icon: string; group: "essential" | "lifestyle" }
> = {
  // Essential
  utilities: { name: "Contas de Casa", icon: "💡", group: "essential" },
  groceries: { name: "Mercado", icon: "🛒", group: "essential" },
  health: { name: "Saúde", icon: "💊", group: "essential" },
  education: { name: "Educação", icon: "📚", group: "essential" },
  insurance: { name: "Seguros", icon: "🛡️", group: "essential" },
  childcare: { name: "Creche/Escola", icon: "👶", group: "essential" },
  petcare: { name: "Pet (Ração/Veterinário)", icon: "🐾", group: "essential" },
  // Lifestyle
  dining: { name: "Alimentação Fora", icon: "🍽️", group: "lifestyle" },
  clothing: { name: "Vestuário", icon: "👕", group: "lifestyle" },
  streaming: { name: "Streaming", icon: "📺", group: "lifestyle" },
  gym: { name: "Academia", icon: "💪", group: "lifestyle" },
  beauty: { name: "Beleza/Cuidados", icon: "💅", group: "lifestyle" },
  hobbies: { name: "Hobbies", icon: "🎨", group: "lifestyle" },
  subscriptions: { name: "Assinaturas", icon: "📦", group: "lifestyle" },
};

// Detailed utility categories (when user wants to track each utility separately)
const UTILITY_CATEGORIES: Record<string, { name: string; icon: string }> = {
  electricity: { name: "Energia", icon: "⚡" },
  water: { name: "Água", icon: "💧" },
  gas: { name: "Gás", icon: "🔥" },
  internet: { name: "Internet", icon: "🌐" },
  phone: { name: "Telefone", icon: "📱" },
  condominium: { name: "Condomínio", icon: "🏢" },
  iptu: { name: "IPTU", icon: "🏠" },
};

const DEBT_CATEGORIES: Record<string, { name: string; icon: string }> = {
  credit_card_debt: { name: "Dívida Cartão de Crédito", icon: "💳" },
  personal_loan: { name: "Empréstimo Pessoal", icon: "🏦" },
  student_loan: { name: "Financiamento Estudantil", icon: "🎓" },
  car_loan: { name: "Financiamento Veículo", icon: "🚗" },
  overdraft: { name: "Cheque Especial", icon: "⚠️" },
  other_debt: { name: "Outras Dívidas", icon: "📋" },
};

const GOAL_CATEGORIES: Record<string, { name: string; icon: string }> = {
  // Match the values from step-goals.tsx
  travel: { name: "Viagem", icon: "✈️" },
  house: { name: "Casa Própria", icon: "🏡" },
  car: { name: "Carro Novo", icon: "🚗" },
  wedding: { name: "Casamento", icon: "💒" },
  education: { name: "Fundo de Educação", icon: "🎓" },
  emergency: { name: "Reserva de Emergência", icon: "🛡️" },
  retirement: { name: "Aposentadoria", icon: "👴" },
};

const ACCOUNT_CONFIG: Record<
  string,
  { name: string; type: "checking" | "savings" | "credit_card" | "cash" | "investment" | "benefit"; icon: string }
> = {
  checking: { name: "Conta Corrente", type: "checking", icon: "🏦" },
  credit_card: { name: "Cartão de Crédito", type: "credit_card", icon: "💳" },
  vr: { name: "Vale Refeição", type: "benefit", icon: "🍽️" },
  va: { name: "Vale Alimentação", type: "benefit", icon: "🛒" },
  cash: { name: "Dinheiro", type: "cash", icon: "💵" },
  investment: { name: "Investimentos", type: "investment", icon: "📈" },
};

// POST - Complete onboarding
export const POST = withAuthRequired(async (req, context) => {
  const { session } = context;
  const body = await req.json();

  const validation = onboardingSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(
      { error: "Validação falhou", details: validation.error.errors },
      { status: 400 }
    );
  }

  const { data } = validation.data;

  // Capitalize all names
  const displayName = capitalizeWords(data.displayName);
  const partnerName = data.household.partnerName ? capitalizeWords(data.household.partnerName) : "";
  const childrenNames = data.household.children.map((name) => name ? capitalizeWords(name) : "");
  const otherAdultNames = data.household.otherAdults.map((name) => name ? capitalizeWords(name) : "");
  const petNames = data.household.pets.map((name) => name ? capitalizeWords(name) : "");
  const customGoal = data.customGoal ? capitalizeWords(data.customGoal) : "";

  // 1. Find user's existing budget (created on registration)
  const [existingMembership] = await db
    .select({
      budgetId: budgetMembers.budgetId,
      memberId: budgetMembers.id,
    })
    .from(budgetMembers)
    .where(
      and(
        eq(budgetMembers.userId, session.user.id),
        eq(budgetMembers.type, "owner")
      )
    )
    .limit(1);

  if (!existingMembership) {
    return NextResponse.json(
      { error: "Orçamento não encontrado. Por favor, faça login novamente." },
      { status: 400 }
    );
  }

  const budgetId = existingMembership.budgetId;

  // 2. Update user with displayName and mark onboarding as complete
  await db
    .update(users)
    .set({
      displayName,
      onboardingCompletedAt: new Date(),
      lastBudgetId: budgetId,
    })
    .where(eq(users.id, session.user.id));

  // 3. Update budget name
  await db
    .update(budgets)
    .set({
      name: `Orçamento de ${displayName}`,
      description: "Orçamento personalizado",
    })
    .where(eq(budgets.id, budgetId));

  // 4. Update owner member name
  await db
    .update(budgetMembers)
    .set({ name: displayName })
    .where(eq(budgetMembers.id, existingMembership.memberId));

  // Get the owner member for use later
  const [ownerMember] = await db
    .select()
    .from(budgetMembers)
    .where(eq(budgetMembers.id, existingMembership.memberId));

  // 5. Add additional household members
  const memberInserts: Array<{
    budgetId: string;
    name: string;
    type: "partner" | "child" | "pet";
  }> = [];

  // Partner
  if (data.household.hasPartner && partnerName) {
    memberInserts.push({
      budgetId,
      name: partnerName,
      type: "partner",
    });
  }

  // Children
  for (const childName of childrenNames) {
    if (childName) {
      memberInserts.push({
        budgetId,
        name: childName,
        type: "child",
      });
    }
  }

  // Other adults (as partner type since they share expenses)
  for (const adultName of otherAdultNames) {
    if (adultName) {
      memberInserts.push({
        budgetId,
        name: adultName,
        type: "partner",
      });
    }
  }

  // Pets
  for (const petName of petNames) {
    if (petName) {
      memberInserts.push({
        budgetId,
        name: petName,
        type: "pet",
      });
    }
  }

  const createdMembers =
    memberInserts.length > 0
      ? await db.insert(budgetMembers).values(memberInserts).returning()
      : [];

  const allMembers = [ownerMember, ...createdMembers];

  // 6. Ensure groups exist
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

  const allGroups = await db.select().from(groups);
  if (allGroups.length === 0) {
    return NextResponse.json(
      { error: "Grupos não encontrados. Por favor, execute o seed do banco de dados." },
      { status: 500 }
    );
  }
  const groupByCode = Object.fromEntries(allGroups.map((g) => [g.code, g]));

  // 7. Create financial accounts
  const accountInserts = data.accounts.map((accountCode, index) => {
    const config = ACCOUNT_CONFIG[accountCode];
    return {
      budgetId,
      name: config.name,
      type: config.type,
      icon: config.icon,
      displayOrder: index,
    };
  });

  if (accountInserts.length > 0) {
    await db.insert(financialAccounts).values(accountInserts);
  }

  // 8. Create categories based on onboarding selections
  const categoryInserts: Array<{
    budgetId: string;
    groupId: string;
    memberId?: string;
    name: string;
    icon: string;
    behavior: "refill_up" | "set_aside";
    plannedAmount: number;
    displayOrder: number;
  }> = [];

  let displayOrder = 0;

  // Essential categories

  // Housing category
  if (data.housing && HOUSING_CATEGORIES[data.housing]) {
    const cat = HOUSING_CATEGORIES[data.housing];
    categoryInserts.push({
      budgetId,
      groupId: groupByCode.essential.id,
      name: cat.name,
      icon: cat.icon,
      behavior: "refill_up",
      plannedAmount: 0,
      displayOrder: displayOrder++,
    });
  }

  // Transport categories
  for (const transport of data.transport) {
    if (TRANSPORT_CATEGORIES[transport]) {
      const cat = TRANSPORT_CATEGORIES[transport];
      categoryInserts.push({
        budgetId,
        groupId: groupByCode.essential.id,
        name: cat.name,
        icon: cat.icon,
        behavior: "refill_up",
        plannedAmount: 0,
        displayOrder: displayOrder++,
      });
    }
  }

  // Expense categories
  for (const expense of [
    ...data.expenses.essential,
    ...data.expenses.lifestyle,
  ]) {
    // Handle utilities specially if detailed
    if (expense === "utilities") {
      const utilitiesDetailed = data.expenses.utilitiesDetailed;
      const utilitiesItems = data.expenses.utilitiesItems || [];

      if (utilitiesDetailed && utilitiesItems.length > 0) {
        // Create separate category for each selected utility
        for (const utilityItem of utilitiesItems) {
          if (UTILITY_CATEGORIES[utilityItem]) {
            const cat = UTILITY_CATEGORIES[utilityItem];
            categoryInserts.push({
              budgetId,
              groupId: groupByCode.essential.id,
              name: cat.name,
              icon: cat.icon,
              behavior: "refill_up",
              plannedAmount: 0,
              displayOrder: displayOrder++,
            });
          }
        }
      } else {
        // Create single "Contas de Casa" category
        const cat = EXPENSE_CATEGORIES.utilities;
        categoryInserts.push({
          budgetId,
          groupId: groupByCode.essential.id,
          name: cat.name,
          icon: cat.icon,
          behavior: "refill_up",
          plannedAmount: 0,
          displayOrder: displayOrder++,
        });
      }
    } else if (EXPENSE_CATEGORIES[expense]) {
      const cat = EXPENSE_CATEGORIES[expense];
      categoryInserts.push({
        budgetId,
        groupId: groupByCode[cat.group].id,
        name: cat.name,
        icon: cat.icon,
        behavior: "refill_up",
        plannedAmount: 0,
        displayOrder: displayOrder++,
      });
    }
  }

  // Debt categories (under essential - debts are obligations)
  for (const debt of data.debts) {
    if (DEBT_CATEGORIES[debt]) {
      const cat = DEBT_CATEGORIES[debt];
      categoryInserts.push({
        budgetId,
        groupId: groupByCode.essential.id,
        name: cat.name,
        icon: cat.icon,
        behavior: "refill_up",
        plannedAmount: 0,
        displayOrder: displayOrder++,
      });
    }
  }

  // Personal spending groups - one group per member (each member has their own "Gastos pessoais - [Nome]" group)
  // These groups allow members to create their own categories inside
  // Note: For pets and children, these groups are shared/visible to all budget participants
  for (const member of allMembers) {
    const isPet = member.type === "pet";
    const isChild = member.type === "child";

    const [personalGroup] = await db
      .insert(groups)
      .values({
        code: "personal",
        name: `Gastos pessoais - ${member.name}`,
        description: isChild
          ? `Categorias de gastos de ${member.name} (compartilhado)`
          : isPet
            ? `Categorias de gastos do pet ${member.name} (compartilhado)`
            : `Categorias de gastos pessoais de ${member.name}`,
        icon: isPet ? "🐾" : isChild ? "👶" : "👤",
        displayOrder: 3, // Personal groups come after lifestyle (2) and before investments (4)
        budgetId,
        memberId: member.id,
      })
      .returning();

    // Create a default category inside the personal group for the member to start with
    categoryInserts.push({
      budgetId,
      groupId: personalGroup.id,
      memberId: member.id,
      name: isPet ? "Pet" : "Geral",
      icon: isPet ? "🐾" : "💸",
      behavior: "refill_up",
      plannedAmount: 0,
      displayOrder: displayOrder++,
    });
  }

  // Goal categories
  for (const goal of data.goals) {
    if (goal === "other" && customGoal) {
      categoryInserts.push({
        budgetId,
        groupId: groupByCode.goals.id,
        name: customGoal,
        icon: "🎯",
        behavior: "set_aside",
        plannedAmount: 0,
        displayOrder: displayOrder++,
      });
    } else if (GOAL_CATEGORIES[goal]) {
      const cat = GOAL_CATEGORIES[goal];
      // Emergency fund goes to investments group
      const groupCode = goal === "emergency" ? "investments" : "goals";
      categoryInserts.push({
        budgetId,
        groupId: groupByCode[groupCode].id,
        name: cat.name,
        icon: cat.icon,
        behavior: "set_aside",
        plannedAmount: 0,
        displayOrder: displayOrder++,
      });
    }
  }

  if (categoryInserts.length > 0) {
    await db.insert(categories).values(categoryInserts);
  }

  return NextResponse.json(
    {
      success: true,
      budgetId,
      message: "Onboarding completo com sucesso!",
    },
    { status: 201 }
  );
});
