import { inngest } from "../client";
import { db } from "@/db";
import { recurringBills, transactions, incomeSources } from "@/db/schema";
import { eq, and, lte, inArray, isNotNull } from "drizzle-orm";

/**
 * Auto-clears transactions for:
 * - Recurring bills with isAutoDebit=true
 * - Income sources with isAutoConfirm=true
 *
 * Runs daily at 6:00 AM (UTC-3 = Brasilia time)
 *
 * For each pending transaction linked to an auto-confirm source:
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

    let clearedExpenses = 0;
    let clearedIncome = 0;
    const clearedDescriptions: string[] = [];

    // ========== AUTO-CLEAR EXPENSES (recurring bills) ==========
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

    if (autoDebitBills.length > 0) {
      const billIds = autoDebitBills.map((b) => b.id);

      const pendingExpenses = await step.run("fetch-pending-expenses", async () => {
        return db
          .select({ id: transactions.id, description: transactions.description })
          .from(transactions)
          .where(
            and(
              eq(transactions.status, "pending"),
              eq(transactions.type, "expense"),
              isNotNull(transactions.recurringBillId),
              inArray(transactions.recurringBillId, billIds),
              lte(transactions.date, today)
            )
          );
      });

      if (pendingExpenses.length > 0) {
        const expenseIds = pendingExpenses.map((t) => t.id);

        await step.run("clear-expenses", async () => {
          await db
            .update(transactions)
            .set({
              status: "cleared",
              updatedAt: new Date(),
            })
            .where(inArray(transactions.id, expenseIds));
        });

        clearedExpenses = pendingExpenses.length;
        clearedDescriptions.push(...pendingExpenses.map((t) => `[D] ${t.description}`));
      }
    }

    // ========== AUTO-CONFIRM INCOME (income sources) ==========
    const autoConfirmSources = await step.run("fetch-auto-confirm-sources", async () => {
      return db
        .select({ id: incomeSources.id })
        .from(incomeSources)
        .where(
          and(
            eq(incomeSources.isActive, true),
            eq(incomeSources.isAutoConfirm, true)
          )
        );
    });

    if (autoConfirmSources.length > 0) {
      const sourceIds = autoConfirmSources.map((s) => s.id);

      const pendingIncome = await step.run("fetch-pending-income", async () => {
        return db
          .select({ id: transactions.id, description: transactions.description })
          .from(transactions)
          .where(
            and(
              eq(transactions.status, "pending"),
              eq(transactions.type, "income"),
              isNotNull(transactions.incomeSourceId),
              inArray(transactions.incomeSourceId, sourceIds),
              lte(transactions.date, today)
            )
          );
      });

      if (pendingIncome.length > 0) {
        const incomeIds = pendingIncome.map((t) => t.id);

        await step.run("clear-income", async () => {
          await db
            .update(transactions)
            .set({
              status: "cleared",
              updatedAt: new Date(),
            })
            .where(inArray(transactions.id, incomeIds));
        });

        clearedIncome = pendingIncome.length;
        clearedDescriptions.push(...pendingIncome.map((t) => `[R] ${t.description}`));
      }
    }

    const totalCleared = clearedExpenses + clearedIncome;

    if (totalCleared === 0) {
      return { cleared: 0, message: "No transactions to auto-clear" };
    }

    return {
      cleared: totalCleared,
      expenses: clearedExpenses,
      income: clearedIncome,
      transactions: clearedDescriptions,
    };
  }
);
