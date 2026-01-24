/**
 * Script to cleanup duplicate transactions (income and expenses)
 *
 * Problem: When a user manually creates a transaction instead of marking
 * the pending one as cleared, both transactions exist and are summed together.
 *
 * This script finds and removes pending transactions when a cleared
 * transaction already exists for the same income source or recurring bill in the same month.
 *
 * Run with: npx tsx scripts/cleanup-duplicate-income-transactions.ts
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

const client = postgres(process.env.DATABASE_URL!);
const db = drizzle(client);
import { transactions } from "../src/db/schema";
import { eq, and, inArray, gte, lte } from "drizzle-orm";

async function cleanupDuplicateTransactions() {
  console.log("=== Cleanup Duplicate Transactions ===\n");

  // Get current month range
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const startDate = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0));
  const lastDayOfMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const endDate = new Date(Date.UTC(year, month - 1, lastDayOfMonth, 23, 59, 59));

  console.log(`Checking period: ${startDate.toISOString()} to ${endDate.toISOString()}\n`);

  // Get all transactions for this month
  const allTransactions = await db
    .select()
    .from(transactions)
    .where(
      and(
        gte(transactions.date, startDate),
        lte(transactions.date, endDate),
        inArray(transactions.status, ["pending", "cleared", "reconciled"])
      )
    );

  console.log(`Found ${allTransactions.length} total transactions\n`);

  const toDelete: string[] = [];

  // ========== INCOME DUPLICATES ==========
  console.log("--- Checking Income Duplicates ---");
  const incomeTransactions = allTransactions.filter(t => t.type === "income" && t.incomeSourceId);

  // Group by incomeSourceId
  const byIncomeSource = new Map<string, typeof incomeTransactions>();
  for (const t of incomeTransactions) {
    if (!byIncomeSource.has(t.incomeSourceId!)) {
      byIncomeSource.set(t.incomeSourceId!, []);
    }
    byIncomeSource.get(t.incomeSourceId!)!.push(t);
  }

  // Find income duplicates
  for (const [incomeSourceId, txns] of byIncomeSource) {
    const pending = txns.filter(t => t.status === "pending");
    const confirmed = txns.filter(t => t.status === "cleared" || t.status === "reconciled");

    // If we have both pending and confirmed transactions, the pending is a duplicate
    if (pending.length > 0 && confirmed.length > 0) {
      console.log(`Income Source ${incomeSourceId}:`);
      console.log(`  - ${pending.length} pending transaction(s)`);
      console.log(`  - ${confirmed.length} confirmed transaction(s)`);

      for (const p of pending) {
        console.log(`  → Will delete: "${p.description}" (R$ ${(p.amount / 100).toFixed(2)}, status: ${p.status})`);
        toDelete.push(p.id);
      }
      console.log("");
    }
  }

  // ========== EXPENSE DUPLICATES ==========
  console.log("\n--- Checking Expense Duplicates ---");
  const expenseTransactions = allTransactions.filter(t => t.type === "expense" && t.recurringBillId);

  // Group by recurringBillId
  const byRecurringBill = new Map<string, typeof expenseTransactions>();
  for (const t of expenseTransactions) {
    if (!byRecurringBill.has(t.recurringBillId!)) {
      byRecurringBill.set(t.recurringBillId!, []);
    }
    byRecurringBill.get(t.recurringBillId!)!.push(t);
  }

  // Find expense duplicates
  for (const [recurringBillId, txns] of byRecurringBill) {
    const pending = txns.filter(t => t.status === "pending");
    const confirmed = txns.filter(t => t.status === "cleared" || t.status === "reconciled");

    // If we have both pending and confirmed transactions, the pending is a duplicate
    if (pending.length > 0 && confirmed.length > 0) {
      console.log(`Recurring Bill ${recurringBillId}:`);
      console.log(`  - ${pending.length} pending transaction(s)`);
      console.log(`  - ${confirmed.length} confirmed transaction(s)`);

      for (const p of pending) {
        console.log(`  → Will delete: "${p.description}" (R$ ${(p.amount / 100).toFixed(2)}, status: ${p.status})`);
        toDelete.push(p.id);
      }
      console.log("");
    }
  }

  // ========== DELETE DUPLICATES ==========
  if (toDelete.length === 0) {
    console.log("\nNo duplicate transactions found to delete.");
    return;
  }

  console.log(`\n=== Deleting ${toDelete.length} duplicate transaction(s) ===`);

  for (const id of toDelete) {
    await db.delete(transactions).where(eq(transactions.id, id));
    console.log(`  Deleted: ${id}`);
  }

  console.log("\nCleanup complete!");
}

// Run the script
cleanupDuplicateTransactions()
  .then(async () => {
    await client.end();
    process.exit(0);
  })
  .catch(async (error) => {
    console.error("Error:", error);
    await client.end();
    process.exit(1);
  });
