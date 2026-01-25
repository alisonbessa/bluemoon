import { NextResponse } from "next/server";
import withSuperAdminAuthRequired from "@/shared/lib/auth/withSuperAdminAuthRequired";
import { db } from "@/db";
import { sql } from "drizzle-orm";

/**
 * POST /api/super-admin/database/reset
 *
 * Resets all HiveBudget data. Optionally includes user data.
 * Requires confirmation code "RESET_ALL_DATA" to execute.
 *
 * Options:
 * - includeUsers: boolean - Also delete users, credits, coupons (default: false)
 *
 * Tables always deleted:
 * - transactions, monthly_allocations, monthly_income_allocations, monthly_budget_status
 * - recurring_bills, income_sources, goals
 * - categories, financial_accounts, budget_members, invites
 * - budgets, groups
 * - telegram_users, telegram_ai_logs, telegram_pending_connections
 *
 * Tables deleted when includeUsers=true:
 * - users, credits, credit_transactions, coupons, accounts, sessions, verification_tokens
 *
 * Tables always preserved:
 * - plans, contact_messages, waitlist
 */
export const POST = withSuperAdminAuthRequired(async (req) => {
  try {
    const body = await req.json();
    const { confirmationCode, includeUsers = false } = body;

    if (confirmationCode !== "RESET_ALL_DATA") {
      return NextResponse.json(
        {
          error: "Invalid confirmation code",
          message: "Please provide the correct confirmation code to reset the database",
        },
        { status: 400 }
      );
    }

    const baseTables = [
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
    ];

    const userTables = [
      "credits",
      "credit_transactions",
      "coupons",
      "sessions",
      "accounts",
      "verification_tokens",
      "users",
    ];

    const tablesToDelete = includeUsers
      ? [...baseTables, ...userTables]
      : baseTables;

    // Delete tables using TRUNCATE with CASCADE
    // Build dynamic SQL based on selected tables
    await db.execute(sql.raw(`
      TRUNCATE TABLE ${tablesToDelete.join(", ")}
      RESTART IDENTITY CASCADE
    `));

    return NextResponse.json({
      success: true,
      message: includeUsers
        ? "Full database reset completed (including users)"
        : "Database reset completed (users preserved)",
      deletedTables: tablesToDelete,
      includeUsers,
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
