import { inngest } from "../client";
import { db } from "@/db";
import { recurringBills, transactions, financialAccounts, categories } from "@/db/schema";
import { eq, and, gte, lte, inArray } from "drizzle-orm";
import { getScopeFromCategory } from "@/shared/lib/transactions/scope";

/**
 * Generates transactions for active recurring bills
 * Runs on day 1 of each month at 6:00 AM (UTC-3 = Brasilia time)
 *
 * For each active recurring bill:
 * 1. Check if a transaction already exists for this bill in the current month
 * 2. If not, create a pending transaction
 */
export const generateRecurringTransactions = inngest.createFunction(
  {
    id: "generate-recurring-transactions",
    name: "Generate Recurring Transactions",
  },
  { cron: "0 9 1 * *" }, // Day 1 at 9:00 UTC = 6:00 AM Brasilia
  async ({ step }) => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;

    // Calculate date range for current month
    const startOfMonth = new Date(year, month - 1, 1);
    const endOfMonth = new Date(year, month, 0, 23, 59, 59);

    // Get all active recurring bills
    const activeBills = await step.run("fetch-active-bills", async () => {
      return db
        .select()
        .from(recurringBills)
        .where(eq(recurringBills.isActive, true));
    });

    if (activeBills.length === 0) {
      return { created: 0, skipped: 0 };
    }

    // Fetch categories for scope (memberId) derivation
    const categoryIds = [...new Set(activeBills.map((b) => b.categoryId))];
    const billCategories = await step.run("fetch-categories", async () => {
      return db
        .select({ id: categories.id, memberId: categories.memberId })
        .from(categories)
        .where(inArray(categories.id, categoryIds));
    });

    let created = 0;
    let skipped = 0;

    for (const bill of activeBills) {
      // Skip yearly bills that aren't due this month
      if (bill.frequency === "yearly" && bill.dueMonth !== month) {
        skipped++;
        continue;
      }

      // Check if transaction already exists for this bill this month
      const existingTransaction = await step.run(
        `check-existing-${bill.id}`,
        async () => {
          const [existing] = await db
            .select()
            .from(transactions)
            .where(
              and(
                eq(transactions.recurringBillId, bill.id),
                gte(transactions.date, startOfMonth),
                lte(transactions.date, endOfMonth)
              )
            )
            .limit(1);
          return existing;
        }
      );

      if (existingTransaction) {
        skipped++;
        continue;
      }

      // Create new transaction for this bill
      await step.run(`create-transaction-${bill.id}`, async () => {
        // Get account for this bill (required for transaction)
        const accountId = bill.accountId;

        if (!accountId) {
          // Skip bills without account
          return null;
        }

        // Verify account exists and get owner for paidByMemberId
        const [account] = await db
          .select({ id: financialAccounts.id, ownerId: financialAccounts.ownerId })
          .from(financialAccounts)
          .where(eq(financialAccounts.id, accountId))
          .limit(1);

        if (!account || !account.ownerId) {
          return null;
        }

        // Calculate transaction date (use dueDay or today if not set)
        const dueDay = bill.dueDay || now.getDate();
        const transactionDate = new Date(year, month - 1, Math.min(dueDay, endOfMonth.getDate()));

        // Derive scope from category
        const memberId = getScopeFromCategory(bill.categoryId, billCategories, account.ownerId);

        // Create pending expense transaction
        await db.insert(transactions).values({
          budgetId: bill.budgetId,
          accountId: accountId,
          categoryId: bill.categoryId,
          recurringBillId: bill.id,
          type: "expense",
          status: "pending",
          amount: bill.amount,
          description: bill.name,
          date: transactionDate,
          source: "recurring",
          memberId,
          paidByMemberId: account.ownerId,
        });

        created++;
        return { billId: bill.id, name: bill.name };
      });
    }

    return {
      created,
      skipped,
      total: activeBills.length,
      month: `${year}-${month.toString().padStart(2, "0")}`,
    };
  }
);
