import { inngest } from "../client";
import { db } from "@/db";
import { transactions, financialAccounts } from "@/db/schema";
import { eq, and, lte, inArray, ne } from "drizzle-orm";

/**
 * Marks pending installment transactions as `cleared` when their date has
 * passed, for accounts that are NOT credit cards.
 *
 * Why exclude credit cards: on a credit card, each installment represents a
 * commitment that only becomes "really paid" when the corresponding monthly
 * bill is paid. That transition is handled by `auto-pay-credit-cards` (and by
 * manual bill payment flows).
 *
 * Daily at 9:00 UTC (6:00 AM Brasilia). Idempotent: only picks transactions
 * still in `pending` status.
 */
export const matureInstallments = inngest.createFunction(
  {
    id: "mature-installments",
    name: "Mature Installment Transactions",
  },
  { cron: "0 9 * * *" },
  async ({ step }) => {
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    const pending = await step.run("fetch-pending-installments", async () => {
      return db
        .select({
          id: transactions.id,
          description: transactions.description,
        })
        .from(transactions)
        .innerJoin(financialAccounts, eq(transactions.accountId, financialAccounts.id))
        .where(
          and(
            eq(transactions.isInstallment, true),
            eq(transactions.status, "pending"),
            lte(transactions.date, today),
            ne(financialAccounts.type, "credit_card"),
          )
        );
    });

    if (pending.length === 0) {
      return { matured: 0, message: "No installments to mature" };
    }

    const ids = pending.map((p) => p.id);

    await step.run("mature-installments", async () => {
      await db
        .update(transactions)
        .set({ status: "cleared", updatedAt: new Date() })
        .where(inArray(transactions.id, ids));
    });

    return {
      matured: pending.length,
      transactions: pending.map((p) => p.description).filter(Boolean),
    };
  }
);
