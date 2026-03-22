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
    let userBudgets: (typeof budgets.$inferSelect)[] = [];
    if (budgetIds.length > 0) {
      const budgetResults = await Promise.all(
        budgetIds.map(async (budgetId) => {
          const [row] = await db
            .select()
            .from(budgets)
            .where(eq(budgets.id, budgetId));
          return row;
        })
      );
      userBudgets = budgetResults.filter(Boolean);
    }

    // Fetch financial accounts for user's budgets
    let userAccounts: (typeof financialAccounts.$inferSelect)[] = [];
    if (budgetIds.length > 0) {
      const accountResults = await Promise.all(
        budgetIds.map((budgetId) =>
          db
            .select()
            .from(financialAccounts)
            .where(eq(financialAccounts.budgetId, budgetId))
        )
      );
      userAccounts = accountResults.flat();
    }

    // Fetch categories for user's budgets
    let userCategories: (typeof categories.$inferSelect)[] = [];
    if (budgetIds.length > 0) {
      const categoryResults = await Promise.all(
        budgetIds.map((budgetId) =>
          db
            .select()
            .from(categories)
            .where(eq(categories.budgetId, budgetId))
        )
      );
      userCategories = categoryResults.flat();
    }

    // Fetch transactions for user's budgets
    let userTransactions: (typeof transactions.$inferSelect)[] = [];
    if (budgetIds.length > 0) {
      const transactionResults = await Promise.all(
        budgetIds.map((budgetId) =>
          db
            .select()
            .from(transactions)
            .where(eq(transactions.budgetId, budgetId))
            .orderBy(transactions.date, transactions.createdAt)
        )
      );
      userTransactions = transactionResults.flat();
    }

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
