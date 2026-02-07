import withAuthRequired from "@/shared/lib/auth/withAuthRequired";
import { createLogger } from "@/shared/lib/logger";
import { db } from "@/db";
import { users } from "@/db/schema/user";
import {
  budgets,
  budgetMembers,
  transactions,
  financialAccounts,
  categories,
} from "@/db/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { internalError } from "@/shared/lib/api/responses";
import { recordAuditLog } from "@/shared/lib/security/audit-log";

const logger = createLogger("api:account:export");

export const GET = withAuthRequired(async (req, context) => {
  try {
    const { session } = context;
    const userId = session.user.id;

    // Fetch user profile
    const [userProfile] = await db
      .select({
        id: users.id,
        name: users.name,
        displayName: users.displayName,
        email: users.email,
        image: users.image,
        createdAt: users.createdAt,
        onboardingCompletedAt: users.onboardingCompletedAt,
        role: users.role,
        trialEndsAt: users.trialEndsAt,
        deletedAt: users.deletedAt,
        deletionRequestedAt: users.deletionRequestedAt,
        deletionReason: users.deletionReason,
      })
      .from(users)
      .where(eq(users.id, userId));

    // Fetch budget memberships to find all budgets the user belongs to
    const memberships = await db
      .select()
      .from(budgetMembers)
      .where(eq(budgetMembers.userId, userId));

    const budgetIds = memberships.map((m) => m.budgetId);

    // Fetch budgets
    const userBudgets =
      budgetIds.length > 0
        ? await Promise.all(
            budgetIds.map((budgetId) =>
              db
                .select()
                .from(budgets)
                .where(eq(budgets.id, budgetId))
                .then((rows) => rows[0])
            )
          ).then((results) => results.filter(Boolean))
        : [];

    // Fetch financial accounts for user's budgets
    const userAccounts =
      budgetIds.length > 0
        ? await Promise.all(
            budgetIds.map((budgetId) =>
              db
                .select()
                .from(financialAccounts)
                .where(eq(financialAccounts.budgetId, budgetId))
            )
          ).then((results) => results.flat())
        : [];

    // Fetch categories for user's budgets
    const userCategories =
      budgetIds.length > 0
        ? await Promise.all(
            budgetIds.map((budgetId) =>
              db
                .select()
                .from(categories)
                .where(eq(categories.budgetId, budgetId))
            )
          ).then((results) => results.flat())
        : [];

    // Fetch transactions for user's budgets
    const userTransactions =
      budgetIds.length > 0
        ? await Promise.all(
            budgetIds.map((budgetId) =>
              db
                .select()
                .from(transactions)
                .where(eq(transactions.budgetId, budgetId))
            )
          ).then((results) => results.flat())
        : [];

    const exportData = {
      exportedAt: new Date().toISOString(),
      user: userProfile ?? null,
      memberships,
      budgets: userBudgets,
      accounts: userAccounts,
      categories: userCategories,
      transactions: userTransactions,
    };

    // Record audit log for data export
    await recordAuditLog({
      userId,
      action: "export.data",
      resource: "user",
      resourceId: userId,
      details: {
        type: "lgpd_data_export",
        budgetCount: userBudgets.length,
        transactionCount: userTransactions.length,
        accountCount: userAccounts.length,
        categoryCount: userCategories.length,
      },
      req,
    });

    logger.info(
      `LGPD data export completed for user ${userId}: ${userBudgets.length} budgets, ${userTransactions.length} transactions`
    );

    const jsonContent = JSON.stringify(exportData, null, 2);

    return new NextResponse(jsonContent, {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="hivebudget-data-export-${new Date().toISOString().split("T")[0]}.json"`,
      },
    });
  } catch (error) {
    logger.error("Error exporting user data:", error);
    return internalError("Failed to export user data");
  }
});
