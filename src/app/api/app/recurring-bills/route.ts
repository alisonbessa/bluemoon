import withAuthRequired from "@/shared/lib/auth/withAuthRequired";
import { db } from "@/db";
import { recurringBills, financialAccounts, categories } from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { getUserBudgetIds } from "@/shared/lib/api/permissions";
import {
  validationError,
  forbiddenError,
  notFoundError,
  successResponse,
} from "@/shared/lib/api/responses";
import { createRecurringBillSchema } from "@/shared/lib/validations";

// GET - Get recurring bills for a category or budget
export const GET = withAuthRequired(async (req, context) => {
  const { session } = context;
  const { searchParams } = new URL(req.url);
  const budgetId = searchParams.get("budgetId");
  const categoryId = searchParams.get("categoryId");

  const budgetIds = await getUserBudgetIds(session.user.id);
  if (budgetIds.length === 0) {
    return successResponse({ recurringBills: [] });
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

  return successResponse({
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
    return validationError(validation.error);
  }

  const { budgetId, ...billData } = validation.data;

  // Check user has access to budget
  const budgetIds = await getUserBudgetIds(session.user.id);
  if (!budgetIds.includes(budgetId)) {
    return forbiddenError("Budget not found or access denied");
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
    return notFoundError("Category");
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

  return successResponse({ recurringBill: newBill }, 201);
});
