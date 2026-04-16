import { inngest } from "../client";
import { db } from "@/db";
import { financialAccounts, transactions } from "@/db/schema";
import { eq, and, gte, lte, inArray, isNotNull } from "drizzle-orm";
import { getClosedBillDates } from "@/shared/lib/billing-cycle";

/**
 * On the credit card closing day, creates a PENDING transfer from the linked
 * payment account to the card for the closed-bill total, dated on the card's
 * next dueDay. Gives the user advance visibility of what will be paid without
 * affecting balances until the transfer is cleared (manually or by auto-pay).
 *
 * Runs daily at 9:00 UTC.
 *
 * For each credit card with closingDay=today and paymentAccountId set:
 *   1. Calculate the closed bill total.
 *   2. Skip if the bill is R$ 0.
 *   3. Skip if a pending/cleared transfer for this cycle already exists.
 *   4. Insert a pending transfer dated on the card's next dueDay.
 */

function computeNextDueDate(
  closingDay: number,
  dueDay: number,
  reference: Date
): Date {
  const year = reference.getFullYear();
  const month = reference.getMonth() + 1;

  let targetYear = year;
  let targetMonth = month;
  if (dueDay <= closingDay) {
    targetMonth += 1;
    if (targetMonth > 12) {
      targetMonth = 1;
      targetYear += 1;
    }
  }

  const lastDay = new Date(targetYear, targetMonth, 0).getDate();
  const day = Math.min(dueDay, lastDay);
  return new Date(targetYear, targetMonth - 1, day, 12, 0, 0, 0);
}

export const generateClosingDayBills = inngest.createFunction(
  {
    id: "generate-closing-day-bills",
    name: "Generate Pending Credit Card Bill Transfers on Closing",
  },
  { cron: "0 9 * * *" },
  async ({ step }) => {
    const now = new Date();
    const todayDay = now.getDate();
    const lastDayOfThisMonth = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      0
    ).getDate();

    const cards = await step.run("fetch-cards-closing-today", async () => {
      return db
        .select({
          id: financialAccounts.id,
          name: financialAccounts.name,
          budgetId: financialAccounts.budgetId,
          closingDay: financialAccounts.closingDay,
          dueDay: financialAccounts.dueDay,
          paymentAccountId: financialAccounts.paymentAccountId,
        })
        .from(financialAccounts)
        .where(
          and(
            eq(financialAccounts.type, "credit_card"),
            eq(financialAccounts.isArchived, false),
            isNotNull(financialAccounts.paymentAccountId),
            isNotNull(financialAccounts.dueDay),
            isNotNull(financialAccounts.closingDay)
          )
        );
    });

    // Clamp closingDay to the month's last day so e.g. closingDay=31 fires on Feb 28
    const closingToday = cards.filter(
      (c) => Math.min(c.closingDay!, lastDayOfThisMonth) === todayDay
    );

    if (closingToday.length === 0) {
      return { created: 0, message: "No credit cards closing today" };
    }

    let created = 0;
    let skipped = 0;
    const details: string[] = [];

    for (const card of closingToday) {
      try {
        const billTotal = await step.run(`calc-${card.id}`, async () => {
          const closedRange = getClosedBillDates(card.closingDay!, now);
          const expenses = await db
            .select({ amount: transactions.amount })
            .from(transactions)
            .where(
              and(
                eq(transactions.accountId, card.id),
                eq(transactions.type, "expense"),
                inArray(transactions.status, ["pending", "cleared", "reconciled"]),
                gte(transactions.date, closedRange.start),
                lte(transactions.date, closedRange.end)
              )
            );
          return expenses.reduce(
            (sum, tx) => sum + Math.abs(Number(tx.amount) || 0),
            0
          );
        });

        if (billTotal <= 0) {
          details.push(`${card.name}: R$ 0 — skipped`);
          skipped++;
          continue;
        }

        const dueDate = computeNextDueDate(
          card.closingDay!,
          card.dueDay!,
          now
        );

        // Idempotent check-and-insert in a single step so Inngest retries can't
        // create a duplicate pending transfer.
        const inserted = await step.run(`ensure-pending-${card.id}`, async () => {
          const dayStart = new Date(
            dueDate.getFullYear(),
            dueDate.getMonth(),
            dueDate.getDate(),
            0,
            0,
            0
          );
          const dayEnd = new Date(
            dueDate.getFullYear(),
            dueDate.getMonth(),
            dueDate.getDate(),
            23,
            59,
            59
          );

          return db.transaction(async (tx) => {
            const existing = await tx
              .select({ id: transactions.id })
              .from(transactions)
              .where(
                and(
                  eq(transactions.type, "transfer"),
                  eq(transactions.accountId, card.paymentAccountId!),
                  eq(transactions.toAccountId, card.id),
                  gte(transactions.date, dayStart),
                  lte(transactions.date, dayEnd),
                  inArray(transactions.status, ["pending", "cleared", "reconciled"])
                )
              )
              .limit(1);

            if (existing.length > 0) return false;

            await tx.insert(transactions).values({
              budgetId: card.budgetId,
              type: "transfer",
              amount: billTotal,
              accountId: card.paymentAccountId!,
              toAccountId: card.id,
              description: `Fatura ${card.name}`,
              date: dueDate,
              status: "pending",
            });
            return true;
          });
        });

        if (!inserted) {
          details.push(`${card.name}: pending transfer already exists — skipped`);
          skipped++;
          continue;
        }

        created++;
        details.push(
          `${card.name}: R$ ${(billTotal / 100).toFixed(2)} pending on ${dueDate.toISOString().slice(0, 10)}`
        );
      } catch (error) {
        console.error(`Closing-day bill failed for card ${card.name}:`, error);
        details.push(`${card.name}: ERROR`);
      }
    }

    return {
      created,
      skipped,
      total: closingToday.length,
      details,
    };
  }
);
