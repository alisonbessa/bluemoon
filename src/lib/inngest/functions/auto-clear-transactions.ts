import { inngest } from "../client";
import { db } from "@/db";
import { recurringBills, transactions } from "@/db/schema";
import { eq, and, lte, inArray, isNotNull } from "drizzle-orm";

/**
 * Auto-clears transactions for recurring bills with isAutoDebit=true
 * Runs daily at 6:00 AM (UTC-3 = Brasilia time)
 *
 * For each pending transaction linked to a recurring bill with isAutoDebit:
 * 1. Check if the transaction date <= today
 * 2. If yes, update status to "cleared"
 */
export const autoClearTransactions = inngest.createFunction(
  {
    id: "auto-clear-transactions",
    name: "Auto Clear Recurring Transactions",
  },
  { cron: "0 9 * * *" }, // Daily at 9:00 UTC = 6:00 AM Brasilia
  async ({ step }) => {
    const today = new Date();
    today.setHours(23, 59, 59, 999); // End of day

    // Get all recurring bills with isAutoDebit=true
    const autoDebitBills = await step.run("fetch-auto-debit-bills", async () => {
      return db
        .select({ id: recurringBills.id })
        .from(recurringBills)
        .where(
          and(
            eq(recurringBills.isActive, true),
            eq(recurringBills.isAutoDebit, true)
          )
        );
    });

    if (autoDebitBills.length === 0) {
      return { cleared: 0, message: "No auto-debit bills found" };
    }

    const billIds = autoDebitBills.map((b) => b.id);

    // Find pending transactions for these bills that are due today or earlier
    const pendingTransactions = await step.run("fetch-pending-transactions", async () => {
      return db
        .select({ id: transactions.id, description: transactions.description })
        .from(transactions)
        .where(
          and(
            eq(transactions.status, "pending"),
            isNotNull(transactions.recurringBillId),
            inArray(transactions.recurringBillId, billIds),
            lte(transactions.date, today)
          )
        );
    });

    if (pendingTransactions.length === 0) {
      return { cleared: 0, message: "No transactions to auto-clear" };
    }

    // Update all matching transactions to cleared
    const transactionIds = pendingTransactions.map((t) => t.id);

    await step.run("clear-transactions", async () => {
      await db
        .update(transactions)
        .set({
          status: "cleared",
          updatedAt: new Date(),
        })
        .where(inArray(transactions.id, transactionIds));
    });

    return {
      cleared: pendingTransactions.length,
      transactions: pendingTransactions.map((t) => t.description),
    };
  }
);
