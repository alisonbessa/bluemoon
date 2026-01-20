import withAuthRequired from "@/shared/lib/auth/withAuthRequired";
import { db } from "@/db";
import { recurringBills, financialAccounts, categories } from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { recurringBillFrequencyEnum } from "@/db/schema/recurring-bills";
import { getUserBudgetIds } from "@/shared/lib/api/permissions";

const createRecurringBillSchema = z.object({
  budgetId: z.string().uuid(),
  categoryId: z.string().uuid(),
  accountId: z.string().uuid(), // obrigatório
  name: z.string().min(1).max(100),
  amount: z.number().int().min(0),
  frequency: recurringBillFrequencyEnum.default("monthly"),
  dueDay: z.number().int().min(0).max(31).optional().nullable(), // 0-6 for weekly, 1-31 for monthly/yearly
  dueMonth: z.number().int().min(1).max(12).optional().nullable(),
  isAutoDebit: z.boolean().default(false),
  isVariable: z.boolean().default(false),
}).refine((data) => {
  // Yearly requires dueMonth
  if (data.frequency === "yearly" && !data.dueMonth) {
    return false;
  }
  return true;
}, {
  message: "Despesa anual requer mês de vencimento",
  path: ["dueMonth"],
}).refine((data) => {
  // Weekly dueDay should be 0-6 (day of week)
  if (data.frequency === "weekly" && data.dueDay !== null && data.dueDay !== undefined) {
    return data.dueDay >= 0 && data.dueDay <= 6;
  }
  return true;
}, {
  message: "Para semanal, dia deve ser 0 (Domingo) a 6 (Sábado)",
  path: ["dueDay"],
}).refine((data) => {
  // Monthly/Yearly dueDay should be 1-31 (day of month)
  if ((data.frequency === "monthly" || data.frequency === "yearly") &&
      data.dueDay !== null && data.dueDay !== undefined) {
    return data.dueDay >= 1 && data.dueDay <= 31;
  }
  return true;
}, {
  message: "Para mensal/anual, dia deve ser 1 a 31",
  path: ["dueDay"],
});

// GET - Get recurring bills for a category or budget
export const GET = withAuthRequired(async (req, context) => {
  const { session } = context;
  const { searchParams } = new URL(req.url);
  const budgetId = searchParams.get("budgetId");
  const categoryId = searchParams.get("categoryId");

  const budgetIds = await getUserBudgetIds(session.user.id);
  if (budgetIds.length === 0) {
    return NextResponse.json({ recurringBills: [] });
  }

  let whereCondition = inArray(recurringBills.budgetId, budgetIds);

  if (budgetId) {
    whereCondition = and(
      eq(recurringBills.budgetId, budgetId),
      inArray(recurringBills.budgetId, budgetIds)
    )!;
  }

  if (categoryId) {
    whereCondition = and(
      whereCondition,
      eq(recurringBills.categoryId, categoryId)
    )!;
  }

  const bills = await db
    .select({
      recurringBill: recurringBills,
      category: {
        id: categories.id,
        name: categories.name,
        icon: categories.icon,
      },
      account: {
        id: financialAccounts.id,
        name: financialAccounts.name,
        icon: financialAccounts.icon,
      },
    })
    .from(recurringBills)
    .leftJoin(categories, eq(recurringBills.categoryId, categories.id))
    .leftJoin(financialAccounts, eq(recurringBills.accountId, financialAccounts.id))
    .where(and(whereCondition, eq(recurringBills.isActive, true)))
    .orderBy(recurringBills.displayOrder);

  const formattedBills = bills.map((b) => ({
    ...b.recurringBill,
    category: b.category,
    account: b.account?.id ? b.account : null,
  }));

  // Calculate total amount per category
  const totalsByCategory = formattedBills.reduce((acc, bill) => {
    if (bill.categoryId) {
      acc[bill.categoryId] = (acc[bill.categoryId] || 0) + bill.amount;
    }
    return acc;
  }, {} as Record<string, number>);

  return NextResponse.json({
    recurringBills: formattedBills,
    totalsByCategory,
  });
});

// POST - Create a new recurring bill
export const POST = withAuthRequired(async (req, context) => {
  const { session } = context;
  const body = await req.json();

  const validation = createRecurringBillSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(
      { error: "Validation failed", details: validation.error.errors },
      { status: 400 }
    );
  }

  const { budgetId, ...billData } = validation.data;

  // Check user has access to budget
  const budgetIds = await getUserBudgetIds(session.user.id);
  if (!budgetIds.includes(budgetId)) {
    return NextResponse.json(
      { error: "Budget not found or access denied" },
      { status: 404 }
    );
  }

  // Verify category belongs to budget
  const [category] = await db
    .select()
    .from(categories)
    .where(
      and(
        eq(categories.id, billData.categoryId),
        eq(categories.budgetId, budgetId)
      )
    );

  if (!category) {
    return NextResponse.json({ error: "Category not found" }, { status: 404 });
  }

  // Get display order
  const existingBills = await db
    .select()
    .from(recurringBills)
    .where(eq(recurringBills.categoryId, billData.categoryId));

  const [newBill] = await db
    .insert(recurringBills)
    .values({
      ...billData,
      budgetId,
      displayOrder: existingBills.length,
    })
    .returning();

  return NextResponse.json({ recurringBill: newBill }, { status: 201 });
});
