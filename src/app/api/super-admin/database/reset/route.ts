import { NextResponse } from "next/server";
import withSuperAdminAuthRequired from "@/shared/lib/auth/withSuperAdminAuthRequired";
import { db } from "@/db";
import { sql } from "drizzle-orm";

/**
 * POST /api/super-admin/database/reset
 *
 * Resets all HiveBudget data while preserving user accounts and system config.
 * Requires confirmation code "RESET_ALL_DATA" to execute.
 *
 * Tables deleted:
 * - transactions, monthly_allocations, monthly_income_allocations, monthly_budget_status
 * - recurring_bills, income_sources, goals
 * - categories, financial_accounts, budget_members, invites
 * - budgets, groups
 * - telegram_users, telegram_ai_logs, telegram_pending_connections
 *
 * Tables preserved:
 * - users, plans, credits, credit_transactions, coupons
 * - contact_messages, waitlist
 */
export const POST = withSuperAdminAuthRequired(async (req) => {
  try {
    const body = await req.json();
    const { confirmationCode } = body;

    if (confirmationCode !== "RESET_ALL_DATA") {
      return NextResponse.json(
        {
          error: "Invalid confirmation code",
          message: "Please provide the correct confirmation code to reset the database",
        },
        { status: 400 }
      );
    }

    // Delete tables in order respecting foreign key constraints
    // Using raw SQL for TRUNCATE with CASCADE for efficiency
    await db.execute(sql`
      TRUNCATE TABLE
        transactions,
        monthly_allocations,
        monthly_income_allocations,
        monthly_budget_status,
        recurring_bills,
        income_sources,
        goals,
        categories,
        financial_accounts,
        budget_members,
        invites,
        budgets,
        groups,
        telegram_users,
        telegram_ai_logs,
        telegram_pending_connections
      RESTART IDENTITY CASCADE
    `);

    return NextResponse.json({
      success: true,
      message: "Database reset completed successfully",
      deletedTables: [
        "transactions",
        "monthly_allocations",
        "monthly_income_allocations",
        "monthly_budget_status",
        "recurring_bills",
        "income_sources",
        "goals",
        "categories",
        "financial_accounts",
        "budget_members",
        "invites",
        "budgets",
        "groups",
        "telegram_users",
        "telegram_ai_logs",
        "telegram_pending_connections",
      ],
    });
  } catch (error) {
    console.error("Error resetting database:", error);
    return NextResponse.json(
      {
        error: "Failed to reset database",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
});
