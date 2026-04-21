import { NextResponse } from "next/server";
import withSuperAdminAuthRequired from "@/shared/lib/auth/withSuperAdminAuthRequired";
import { createLogger } from "@/shared/lib/logger";
import { db } from "@/db";

const logger = createLogger("api:admin:mock-data");
import { recordAuditLog } from "@/shared/lib/security/audit-log";
import {
  users,
  budgets,
  budgetMembers,
  financialAccounts,
  incomeSources,
  categories,
  groups,
  defaultGroups,
  monthlyAllocations,
  monthlyIncomeAllocations,
  transactions,
  goals,
  plans,
  monthlyBudgetStatus,
} from "@/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { createPersonalGroupForMember } from "@/shared/lib/budget/personal-group";
import { z } from "zod";

const requestSchema = z.object({
  email: z.string().email(),
});

/**
 * POST /api/super-admin/mock-data
 *
 * Populate the database with mock data for a specific user
 */
export const POST = withSuperAdminAuthRequired(async (req, { session }) => {
  try {
    const body = await req.json();
    const { email } = requestSchema.parse(body);

    // Find the user
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (!user) {
      return NextResponse.json(
        { error: "Usuário não encontrado" },
        { status: 404 }
      );
    }

    // Check if user already has a budget and delete existing data
    const existingMembership = await db
      .select({ budgetId: budgetMembers.budgetId })
      .from(budgetMembers)
      .where(eq(budgetMembers.userId, user.id))
      .limit(1);

    if (existingMembership.length > 0) {
      logger.info("Deleting existing budget data for user", { email: user.email });

      // Get all budgets the user is a member of
      const userBudgetIds = existingMembership.map(m => m.budgetId);

      for (const budgetId of userBudgetIds) {
        // Delete in order respecting foreign keys
        // 1. Transactions (references accounts, categories, income sources, members)
        await db.delete(transactions).where(eq(transactions.budgetId, budgetId));

        // 2. Monthly allocations
        await db.delete(monthlyAllocations).where(eq(monthlyAllocations.budgetId, budgetId));
        await db.delete(monthlyIncomeAllocations).where(eq(monthlyIncomeAllocations.budgetId, budgetId));

        // 3. Monthly budget status
        await db.delete(monthlyBudgetStatus).where(eq(monthlyBudgetStatus.budgetId, budgetId));

        // 4. Goals
        await db.delete(goals).where(eq(goals.budgetId, budgetId));

        // 5. Income sources
        await db.delete(incomeSources).where(eq(incomeSources.budgetId, budgetId));

        // 6. Categories
        await db.delete(categories).where(eq(categories.budgetId, budgetId));

        // 7. Accounts
        await db.delete(financialAccounts).where(eq(financialAccounts.budgetId, budgetId));

        // 8. Budget members
        await db.delete(budgetMembers).where(eq(budgetMembers.budgetId, budgetId));

        // 9. Budget itself
        await db.delete(budgets).where(eq(budgets.id, budgetId));
      }

      logger.info("[mock-data] Existing data deleted successfully");
    }

    // Get Duo plan for user
    const [duoPlan] = await db
      .select()
      .from(plans)
      .where(eq(plans.codename, "duo"))
      .limit(1);

    // Update user with Duo plan and lifetime role
    await db
      .update(users)
      .set({
        planId: duoPlan?.id || null,
        role: "lifetime",
        displayName: "Alison",
      })
      .where(eq(users.id, user.id));

    // Get global groups, seed if empty
    let allGroups = await db.select().from(groups).where(isNull(groups.budgetId));

    if (allGroups.length === 0) {
      logger.info("[mock-data] Seeding groups...");
      for (const group of defaultGroups) {
        await db.insert(groups).values(group);
      }
      allGroups = await db.select().from(groups).where(isNull(groups.budgetId));
      logger.info("Groups seeded", { count: allGroups.length });
    }

    const groupMap = Object.fromEntries(allGroups.filter((g) => g.code).map((g) => [g.code!, g.id]));
    logger.info("Group map loaded", { groups: Object.keys(groupMap) });

    // Create budget
    const [budget] = await db
      .insert(budgets)
      .values({
        name: "Orçamento Familiar",
        currency: "BRL",
      })
      .returning();

    // Create budget member (owner)
    const [owner] = await db
      .insert(budgetMembers)
      .values({
        budgetId: budget.id,
        userId: user.id,
        name: user.displayName || user.name || "Alison",
        type: "owner",
        color: "#6366f1",
        monthlyPleasureBudget: 50000, // R$ 500
      })
      .returning();

    // Create partner member
    const [partner] = await db
      .insert(budgetMembers)
      .values({
        budgetId: budget.id,
        userId: null, // Partner not linked to a user account yet
        name: "Parceiro(a)",
        type: "partner",
        color: "#ec4899",
        monthlyPleasureBudget: 50000, // R$ 500
      })
      .returning();

    // Create accounts
    const accountsData = [
      { name: "Nubank", type: "checking" as const, balance: 350000, color: "#8b5cf6", ownerId: owner.id },
      { name: "Inter", type: "checking" as const, balance: 120000, color: "#f97316", ownerId: partner.id },
      { name: "Poupança", type: "savings" as const, balance: 500000, color: "#22c55e", ownerId: null },
      { name: "Cartão Nubank", type: "credit_card" as const, balance: -180000, creditLimit: 800000, closingDay: 3, dueDay: 10, color: "#a855f7", ownerId: owner.id },
      { name: "Cartão Inter", type: "credit_card" as const, balance: -95000, creditLimit: 500000, closingDay: 15, dueDay: 22, color: "#fb923c", ownerId: partner.id },
      { name: "Dinheiro", type: "cash" as const, balance: 15000, color: "#84cc16", ownerId: null },
      { name: "Vale Refeição", type: "benefit" as const, balance: 45000, monthlyDeposit: 80000, depositDay: 5, color: "#ef4444", ownerId: owner.id },
    ];

    const createdAccounts: Record<string, string> = {};
    for (const acc of accountsData) {
      const [account] = await db
        .insert(financialAccounts)
        .values({
          budgetId: budget.id,
          ...acc,
        })
        .returning();
      createdAccounts[acc.name] = account.id;
    }

    // Create income sources
    const incomeSourcesData = [
      { name: "Salário Alison", type: "salary" as const, amount: 850000, memberId: owner.id, accountId: createdAccounts["Nubank"], dayOfMonth: 5 },
      { name: "Salário Parceiro(a)", type: "salary" as const, amount: 650000, memberId: partner.id, accountId: createdAccounts["Inter"], dayOfMonth: 10 },
      { name: "Freelance", type: "freelance" as const, amount: 200000, memberId: owner.id, accountId: createdAccounts["Nubank"], dayOfMonth: 15 },
      { name: "VR", type: "benefit" as const, amount: 80000, memberId: owner.id, accountId: createdAccounts["Vale Refeição"], dayOfMonth: 5 },
    ];

    const createdIncomeSources: Record<string, string> = {};
    for (const inc of incomeSourcesData) {
      const [source] = await db
        .insert(incomeSources)
        .values({
          budgetId: budget.id,
          ...inc,
          frequency: "monthly",
          isActive: true,
        })
        .returning();
      createdIncomeSources[inc.name] = source.id;
    }

    // Create categories
    const categoriesData = [
      // Essential
      { name: "Aluguel", icon: "🏠", groupCode: "essential", plannedAmount: 250000, behavior: "refill_up" as const },
      { name: "Energia", icon: "⚡", groupCode: "essential", plannedAmount: 25000, behavior: "refill_up" as const },
      { name: "Água", icon: "💧", groupCode: "essential", plannedAmount: 12000, behavior: "refill_up" as const },
      { name: "Internet", icon: "📡", groupCode: "essential", plannedAmount: 15000, behavior: "refill_up" as const },
      { name: "Mercado", icon: "🛒", groupCode: "essential", plannedAmount: 150000, behavior: "refill_up" as const },
      { name: "Transporte", icon: "🚗", groupCode: "essential", plannedAmount: 60000, behavior: "refill_up" as const },
      { name: "Saúde", icon: "💊", groupCode: "essential", plannedAmount: 30000, behavior: "set_aside" as const },

      // Lifestyle
      { name: "Restaurantes", icon: "🍽️", groupCode: "lifestyle", plannedAmount: 40000, behavior: "refill_up" as const },
      { name: "Streaming", icon: "📺", groupCode: "lifestyle", plannedAmount: 10000, behavior: "refill_up" as const },
      { name: "Academia", icon: "💪", groupCode: "lifestyle", plannedAmount: 15000, behavior: "refill_up" as const },
      { name: "Vestuário", icon: "👕", groupCode: "lifestyle", plannedAmount: 20000, behavior: "set_aside" as const },
      { name: "Pets", icon: "🐕", groupCode: "lifestyle", plannedAmount: 25000, behavior: "refill_up" as const },

      // Investments
      { name: "Reserva de Emergência", icon: "🛡️", groupCode: "investments", plannedAmount: 100000, behavior: "set_aside" as const },
      { name: "Aposentadoria", icon: "👴", groupCode: "investments", plannedAmount: 50000, behavior: "set_aside" as const },
      { name: "Investimentos", icon: "📈", groupCode: "investments", plannedAmount: 80000, behavior: "set_aside" as const },
    ];

    const createdCategories: Record<string, string> = {};
    for (const cat of categoriesData) {
      const [category] = await db
        .insert(categories)
        .values({
          budgetId: budget.id,
          groupId: groupMap[cat.groupCode],
          name: cat.name,
          icon: cat.icon,
          plannedAmount: cat.plannedAmount,
          behavior: cat.behavior,
          memberId: cat.memberId || null,
        })
        .returning();
      createdCategories[cat.name] = category.id;
    }

    // Create personal groups for owner and partner
    await createPersonalGroupForMember(db, { budgetId: budget.id, memberId: owner.id, memberName: owner.name, displayOrder: 10 });
    await createPersonalGroupForMember(db, { budgetId: budget.id, memberId: partner.id, memberName: partner.name, displayOrder: 11 });

    // Create goals
    const goalsData = [
      { name: "Viagem Europa", icon: "✈️", targetAmount: 3000000, currentAmount: 850000, targetDate: new Date("2025-12-01"), color: "#3b82f6" },
      { name: "Novo Carro", icon: "🚙", targetAmount: 8000000, currentAmount: 1500000, targetDate: new Date("2026-06-01"), color: "#10b981" },
      { name: "Casamento", icon: "💒", targetAmount: 5000000, currentAmount: 200000, targetDate: new Date("2027-03-01"), color: "#f472b6" },
    ];

    for (const goal of goalsData) {
      await db.insert(goals).values({
        budgetId: budget.id,
        accountId: createdAccounts["Poupança"],
        ...goal,
      });
    }

    // Create allocations and transactions for last 3 months
    const now = new Date();
    const months = [
      { year: now.getFullYear(), month: now.getMonth() + 1 }, // Current month
      { year: now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear(), month: now.getMonth() === 0 ? 12 : now.getMonth() }, // Last month
      { year: now.getMonth() <= 1 ? now.getFullYear() - 1 : now.getFullYear(), month: now.getMonth() <= 1 ? 12 + now.getMonth() - 1 : now.getMonth() - 1 }, // 2 months ago
    ];

    for (const { year, month } of months) {
      // Create monthly budget status (mark as active since we have data)
      await db.insert(monthlyBudgetStatus).values({
        budgetId: budget.id,
        year,
        month,
        status: "active",
        startedAt: new Date(year, month - 1, 1),
      });

      // Create monthly allocations for each category
      for (const [catName, catId] of Object.entries(createdCategories)) {
        const catData = categoriesData.find((c) => c.name === catName);
        await db.insert(monthlyAllocations).values({
          budgetId: budget.id,
          categoryId: catId,
          year,
          month,
          allocated: catData?.plannedAmount || 0,
          carriedOver: 0,
        });
      }

      // Create monthly income allocations
      for (const [incName, incId] of Object.entries(createdIncomeSources)) {
        const incData = incomeSourcesData.find((i) => i.name === incName);
        await db.insert(monthlyIncomeAllocations).values({
          budgetId: budget.id,
          incomeSourceId: incId,
          year,
          month,
          planned: incData?.amount || 0,
        });
      }

      // Create transactions for this month
      const transactionsToCreate = generateMonthTransactions(
        budget.id,
        year,
        month,
        createdAccounts,
        createdCategories,
        createdIncomeSources,
        owner.id,
        partner.id
      );

      for (const tx of transactionsToCreate) {
        await db.insert(transactions).values(tx);
      }
    }

    void recordAuditLog({
      userId: session.user.id!,
      action: "admin.mock_data",
      resource: "database",
      details: { email },
      req,
    });

    return NextResponse.json({
      success: true,
      message: "Dados de teste criados com sucesso!",
      data: {
        budgetId: budget.id,
        ownerId: owner.id,
        partnerId: partner.id,
        accountsCount: Object.keys(createdAccounts).length,
        categoriesCount: Object.keys(createdCategories).length,
        incomeSourcesCount: Object.keys(createdIncomeSources).length,
      },
    });
  } catch (error) {
    logger.error("Error creating mock data:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Dados inválidos", details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Falha ao criar dados de teste" },
      { status: 500 }
    );
  }
});

function generateMonthTransactions(
  budgetId: string,
  year: number,
  month: number,
  accounts: Record<string, string>,
  categories: Record<string, string>,
  incomeSources: Record<string, string>,
  ownerId: string,
  partnerId: string
) {
  const txs: Array<{
    budgetId: string;
    accountId: string;
    categoryId?: string | null;
    incomeSourceId?: string | null;
    memberId?: string | null;
    paidByMemberId: string;
    type: "income" | "expense" | "transfer";
    status: "pending" | "cleared" | "reconciled";
    amount: number;
    description: string;
    date: Date;
  }> = [];

  const isCurrentMonth = year === new Date().getFullYear() && month === new Date().getMonth() + 1;
  const daysInMonth = new Date(year, month, 0).getDate();
  const today = new Date().getDate();

  // Helper to create date in the month
  const createDate = (day: number) => {
    const d = new Date(year, month - 1, Math.min(day, daysInMonth));
    return d;
  };

  // Income transactions
  txs.push({
    budgetId,
    accountId: accounts["Nubank"],
    incomeSourceId: incomeSources["Salário Alison"],
    memberId: ownerId,
    paidByMemberId: ownerId,
    type: "income",
    status: isCurrentMonth && 5 > today ? "pending" : "cleared",
    amount: 850000,
    description: "Salário",
    date: createDate(5),
  });

  txs.push({
    budgetId,
    accountId: accounts["Inter"],
    incomeSourceId: incomeSources["Salário Parceiro(a)"],
    memberId: partnerId,
    paidByMemberId: partnerId,
    type: "income",
    status: isCurrentMonth && 10 > today ? "pending" : "cleared",
    amount: 650000,
    description: "Salário",
    date: createDate(10),
  });

  if (Math.random() > 0.3) {
    txs.push({
      budgetId,
      accountId: accounts["Nubank"],
      incomeSourceId: incomeSources["Freelance"],
      memberId: ownerId,
      paidByMemberId: ownerId,
      type: "income",
      status: isCurrentMonth && 15 > today ? "pending" : "cleared",
      amount: 150000 + Math.floor(Math.random() * 100000),
      description: "Projeto freelance",
      date: createDate(15),
    });
  }

  // Expense transactions
  const expenseTemplates = [
    { category: "Aluguel", amount: 250000, day: 5, account: "Nubank", member: ownerId },
    { category: "Energia", amount: 18000 + Math.floor(Math.random() * 14000), day: 10, account: "Nubank", member: ownerId },
    { category: "Água", amount: 8000 + Math.floor(Math.random() * 8000), day: 10, account: "Nubank", member: ownerId },
    { category: "Internet", amount: 14990, day: 15, account: "Nubank", member: ownerId },
    { category: "Mercado", amount: 35000 + Math.floor(Math.random() * 15000), day: 7, account: "Cartão Nubank", member: ownerId },
    { category: "Mercado", amount: 28000 + Math.floor(Math.random() * 12000), day: 14, account: "Cartão Nubank", member: partnerId },
    { category: "Mercado", amount: 42000 + Math.floor(Math.random() * 18000), day: 21, account: "Cartão Inter", member: partnerId },
    { category: "Transporte", amount: 15000, day: 3, account: "Nubank", member: ownerId, description: "Uber" },
    { category: "Transporte", amount: 8000, day: 8, account: "Inter", member: partnerId, description: "Uber" },
    { category: "Transporte", amount: 25000, day: 12, account: "Cartão Nubank", member: ownerId, description: "Combustível" },
    { category: "Restaurantes", amount: 8500, day: 6, account: "Vale Refeição", member: ownerId, description: "Almoço" },
    { category: "Restaurantes", amount: 12000, day: 9, account: "Cartão Nubank", member: ownerId, description: "Jantar fora" },
    { category: "Restaurantes", amount: 9500, day: 13, account: "Vale Refeição", member: ownerId, description: "Almoço" },
    { category: "Restaurantes", amount: 15000, day: 18, account: "Cartão Inter", member: partnerId, description: "Jantar romântico" },
    { category: "Streaming", amount: 4490, day: 1, account: "Cartão Nubank", member: ownerId, description: "Netflix" },
    { category: "Streaming", amount: 3490, day: 1, account: "Cartão Nubank", member: ownerId, description: "Spotify" },
    { category: "Academia", amount: 14990, day: 5, account: "Cartão Inter", member: partnerId, description: "Mensalidade academia" },
    { category: "Pets", amount: 18000, day: 20, account: "Cartão Nubank", member: ownerId, description: "Ração e petiscos" },
    { category: "Alison", amount: 15000 + Math.floor(Math.random() * 20000), day: 12, account: "Cartão Nubank", member: ownerId, description: "Games" },
    { category: "Parceiro(a)", amount: 18000 + Math.floor(Math.random() * 15000), day: 16, account: "Cartão Inter", member: partnerId, description: "Autocuidado" },
  ];

  for (const template of expenseTemplates) {
    if (isCurrentMonth && template.day > today) continue; // Skip future transactions in current month

    txs.push({
      budgetId,
      accountId: accounts[template.account],
      categoryId: categories[template.category],
      memberId: template.member,
      paidByMemberId: template.member,
      type: "expense",
      status: "cleared",
      amount: -template.amount,
      description: template.description || template.category,
      date: createDate(template.day),
    });
  }

  // Add some random small expenses
  const randomExpenses = [
    { categories: ["Mercado"], descriptions: ["Padaria", "Hortifruti", "Açougue"], minAmount: 1500, maxAmount: 5000 },
    { categories: ["Transporte"], descriptions: ["Uber", "99", "Estacionamento"], minAmount: 800, maxAmount: 3000 },
    { categories: ["Restaurantes"], descriptions: ["Café", "Lanche", "Delivery"], minAmount: 1500, maxAmount: 8000 },
  ];

  for (let i = 0; i < 8; i++) {
    const day = Math.floor(Math.random() * daysInMonth) + 1;
    if (isCurrentMonth && day > today) continue;

    const template = randomExpenses[Math.floor(Math.random() * randomExpenses.length)];
    const category = template.categories[Math.floor(Math.random() * template.categories.length)];
    const description = template.descriptions[Math.floor(Math.random() * template.descriptions.length)];
    const amount = template.minAmount + Math.floor(Math.random() * (template.maxAmount - template.minAmount));
    const member = Math.random() > 0.5 ? ownerId : partnerId;
    const account = Math.random() > 0.5 ? "Cartão Nubank" : "Cartão Inter";

    txs.push({
      budgetId,
      accountId: accounts[account],
      categoryId: categories[category],
      memberId: member,
      paidByMemberId: member,
      type: "expense",
      status: "cleared",
      amount: -amount,
      description,
      date: createDate(day),
    });
  }

  return txs;
}
