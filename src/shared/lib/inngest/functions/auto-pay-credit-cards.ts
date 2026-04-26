import { inngest } from "../client";
import { db } from "@/db";
import { financialAccounts, transactions } from "@/db/schema";
import { eq, and, gte, lte, inArray, isNotNull, sql } from "drizzle-orm";
import { getClosedBillDates } from "@/shared/lib/billing-cycle";
import { matureInstallmentsForCreditCardCycle } from "@/shared/lib/transactions/installments";

/**
 * Auto-pays credit card bills on the due day.
 *
 * Runs daily at 9:00 UTC (6:00 AM Brasilia time).
 *
 * For each credit card with isAutoPayEnabled=true and paymentAccountId set:
 * 1. Check if today is the card's dueDay
 * 2. Calculate the closed bill amount
 * 3. Check if a payment transfer already exists (idempotency)
 * 4. Create a transfer from paymentAccount to the credit card
 * 5. Update both account balances
 */
export const autoPayCreditCards = inngest.createFunction(
  {
    id: "auto-pay-credit-cards",
    name: "Auto Pay Credit Card Bills",
  },
  { cron: "0 9 * * *" }, // Daily at 9:00 UTC = 6:00 AM Brasilia
  async ({ step }) => {
    const now = new Date();
    const todayDay = now.getDate();
    const lastDayOfThisMonth = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      0
    ).getDate();

    // Fetch credit cards with auto-pay enabled
    const autoPayCards = await step.run("fetch-auto-pay-cards", async () => {
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
            eq(financialAccounts.isAutoPayEnabled, true),
            eq(financialAccounts.isArchived, false),
            isNotNull(financialAccounts.paymentAccountId),
            isNotNull(financialAccounts.dueDay),
            isNotNull(financialAccounts.closingDay),
          )
        );
    });

    // Filter to cards where today is the due day (clamped so dueDay=31 fires on Feb 28)
    const dueToday = autoPayCards.filter(
      (cc) => Math.min(cc.dueDay!, lastDayOfThisMonth) === todayDay
    );

    if (dueToday.length === 0) {
      return { paid: 0, message: "No credit cards due today" };
    }

    let paid = 0;
    let skipped = 0;
    const details: string[] = [];

    for (const card of dueToday) {
      try {
        // Calculate closed bill amount
        const closedBill = await step.run(`calc-bill-${card.id}`, async () => {
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
                lte(transactions.date, closedRange.end),
              )
            );

          return expenses.reduce((sum, tx) => sum + Math.abs(Number(tx.amount) || 0), 0);
        });

        if (closedBill <= 0) {
          details.push(`${card.name}: R$ 0 - skipped`);
          skipped++;
          continue;
        }

        // Look for a pending transfer (created at closing day) for today.
        // If one exists in cleared/reconciled status, this card was already paid.
        const existingTransfer = await step.run(`check-existing-${card.id}`, async () => {
          const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
          const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

          const [row] = await db
            .select({ id: transactions.id, status: transactions.status, amount: transactions.amount })
            .from(transactions)
            .where(
              and(
                eq(transactions.type, "transfer"),
                eq(transactions.accountId, card.paymentAccountId!),
                eq(transactions.toAccountId, card.id),
                gte(transactions.date, todayStart),
                lte(transactions.date, todayEnd),
                inArray(transactions.status, ["pending", "cleared", "reconciled"]),
              )
            )
            .limit(1);

          return row ?? null;
        });

        if (existingTransfer && existingTransfer.status !== "pending") {
          details.push(`${card.name}: already paid today - skipped`);
          skipped++;
          continue;
        }

        // Validate payment source account is not archived and has sufficient balance
        const paymentCheck = await step.run(`validate-payment-${card.id}`, async () => {
          const [paymentAccount] = await db
            .select({
              balance: financialAccounts.balance,
              isArchived: financialAccounts.isArchived,
            })
            .from(financialAccounts)
            .where(eq(financialAccounts.id, card.paymentAccountId!));

          if (!paymentAccount || paymentAccount.isArchived) {
            return { ok: false, reason: "payment account archived or not found" };
          }
          if (paymentAccount.balance < closedBill) {
            return { ok: false, reason: `insufficient balance (${paymentAccount.balance} < ${closedBill})` };
          }
          return { ok: true, reason: "" };
        });

        if (!paymentCheck.ok) {
          details.push(`${card.name}: ${paymentCheck.reason} - skipped`);
          skipped++;
          continue;
        }

        // Clear the pending transfer if it exists, otherwise create a new cleared one.
        // Either way, update both balances atomically. Also mark all pending
        // installments in the closed billing cycle as `cleared` — paying the bill
        // is what "confirms" each installment on a credit card.
        await step.run(`pay-${card.id}`, async () => {
          await db.transaction(async (tx) => {
            if (existingTransfer) {
              // Bill total may have changed since closing day — sync amount.
              await tx
                .update(transactions)
                .set({ status: "cleared", amount: closedBill, updatedAt: now })
                .where(eq(transactions.id, existingTransfer.id));
            } else {
              await tx.insert(transactions).values({
                budgetId: card.budgetId,
                type: "transfer",
                amount: closedBill,
                accountId: card.paymentAccountId!,
                toAccountId: card.id,
                description: `Pagamento automatico fatura ${card.name}`,
                date: now,
                status: "cleared",
              });
            }

            // The transfer is created/updated as "cleared", so clearedBalance
            // must move on both sides alongside balance.
            await tx
              .update(financialAccounts)
              .set({
                balance: sql`${financialAccounts.balance} - ${closedBill}`,
                clearedBalance: sql`${financialAccounts.clearedBalance} - ${closedBill}`,
                updatedAt: now,
              })
              .where(eq(financialAccounts.id, card.paymentAccountId!));

            await tx
              .update(financialAccounts)
              .set({
                balance: sql`${financialAccounts.balance} + ${closedBill}`,
                clearedBalance: sql`${financialAccounts.clearedBalance} + ${closedBill}`,
                updatedAt: now,
              })
              .where(eq(financialAccounts.id, card.id));

            await matureInstallmentsForCreditCardCycle(tx, {
              creditCardAccountId: card.id,
              closingDay: card.closingDay!,
              referenceDate: now,
            });
          });
        });

        paid++;
        details.push(`${card.name}: R$ ${(closedBill / 100).toFixed(2)} paid`);
      } catch (error) {
        console.error(`Auto-pay failed for card ${card.name}:`, error);
        details.push(`${card.name}: ERROR`);
      }
    }

    return {
      paid,
      skipped,
      total: dueToday.length,
      details,
    };
  }
);
