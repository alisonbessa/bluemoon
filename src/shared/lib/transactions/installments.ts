/**
 * Helpers for installment transactions (pagamentos parcelados).
 *
 * Centralizes amount distribution and creation logic so the API, chat, and
 * messaging integrations (WhatsApp / Telegram) stay in sync.
 */

import { eq, sql, and, gte, lte } from "drizzle-orm";
import type { db as database } from "@/db";
import { financialAccounts, transactions } from "@/db/schema";
import { calculateInstallmentDates, getClosedBillDates } from "@/shared/lib/billing-cycle";

/**
 * Distribute a total amount into `n` installments with NO cent loss.
 *
 * The remainder from integer division is added one cent at a time to the
 * first installments, so `sum(distributeInstallmentAmounts(total, n)) === total`.
 *
 * Example: distributeInstallmentAmounts(10000, 3) → [3334, 3333, 3333]
 *          distributeInstallmentAmounts(10001, 3) → [3334, 3334, 3333]
 *
 * Amounts are in cents (integer).
 */
export function distributeInstallmentAmounts(total: number, n: number): number[] {
  if (n <= 0 || !Number.isFinite(n)) {
    throw new Error("Number of installments must be a positive integer");
  }
  if (!Number.isInteger(total)) {
    throw new Error("Total amount must be an integer (cents)");
  }

  const sign = total < 0 ? -1 : 1;
  const absTotal = Math.abs(total);
  const base = Math.floor(absTotal / n);
  const remainder = absTotal - base * n;

  return Array.from({ length: n }, (_, i) =>
    sign * (base + (i < remainder ? 1 : 0))
  );
}

type DbOrTx = typeof database | Parameters<Parameters<typeof database.transaction>[0]>[0];

interface BalanceChangeParams {
  accountId: string;
  type: "income" | "expense" | "transfer";
  amount: number;
  toAccountId?: string | null;
}

/**
 * Apply the balance change for a newly-inserted or newly-deleted transaction.
 *
 * - income: credit the account by +amount
 * - expense: debit the account by -|amount|
 * - transfer: debit source + credit destination
 *
 * MUST be called from inside a `db.transaction(...)` block — pass the inner `tx`.
 * For transfers, the destination account is also credited.
 */
export async function applyTransactionBalanceChange(tx: DbOrTx, params: BalanceChangeParams) {
  const { accountId, type, amount, toAccountId } = params;

  const balanceChange = type === "income" ? amount : -Math.abs(amount);

  await tx
    .update(financialAccounts)
    .set({
      balance: sql`${financialAccounts.balance} + ${balanceChange}`,
      updatedAt: new Date(),
    })
    .where(eq(financialAccounts.id, accountId));

  if (type === "transfer" && toAccountId) {
    await tx
      .update(financialAccounts)
      .set({
        balance: sql`${financialAccounts.balance} + ${Math.abs(amount)}`,
        updatedAt: new Date(),
      })
      .where(eq(financialAccounts.id, toAccountId));
  }
}

interface CreateInstallmentsParams {
  tx: DbOrTx;
  budgetId: string;
  accountId: string;
  accountType: string;
  categoryId?: string | null;
  incomeSourceId?: string | null;
  toAccountId?: string | null;
  memberId?: string | null;
  paidByMemberId: string;
  type: "income" | "expense" | "transfer";
  totalAmount: number;
  totalInstallments: number;
  description?: string | null;
  notes?: string | null;
  firstDate: Date;
  source?: string;
  status?: "pending" | "cleared" | "reconciled";
}

/**
 * Create a series of installment transactions and atomically update account balances.
 *
 * MUST be called from inside a `db.transaction(...)` block — pass the inner `tx`.
 *
 * Behavior:
 * - Amounts are distributed exactly (no rounding loss).
 * - Dates are computed with `calculateInstallmentDates` (+1 month, clamped).
 * - Parent = installment #1. Children point to parent via `parentTransactionId`.
 * - Credit cards: full total debited at creation (all installments reserve credit limit).
 * - Other accounts: only first installment affects balance immediately.
 * - For transfers: same logic applied to the destination account.
 */
export async function createInstallmentTransactions(params: CreateInstallmentsParams) {
  const {
    tx,
    budgetId,
    accountId,
    accountType,
    categoryId,
    incomeSourceId,
    toAccountId,
    memberId,
    paidByMemberId,
    type,
    totalAmount,
    totalInstallments,
    description,
    notes,
    firstDate,
    source = "web",
    status,
  } = params;

  const isCreditCard = accountType === "credit_card";
  const amounts = distributeInstallmentAmounts(totalAmount, totalInstallments);
  const dates = calculateInstallmentDates(firstDate, totalInstallments);

  const baseValues = {
    budgetId,
    accountId,
    categoryId: type === "expense" ? categoryId ?? undefined : undefined,
    incomeSourceId: type === "income" ? incomeSourceId ?? undefined : undefined,
    toAccountId: type === "transfer" ? toAccountId ?? undefined : undefined,
    memberId: memberId ?? null,
    paidByMemberId,
    type,
    description,
    notes,
    isInstallment: true,
    totalInstallments,
    source,
    ...(status ? { status } : {}),
  };

  const [parent] = await tx
    .insert(transactions)
    .values({
      ...baseValues,
      amount: amounts[0],
      date: dates[0],
      installmentNumber: 1,
    })
    .returning();

  const childValues = amounts.slice(1).map((amount, i) => ({
    ...baseValues,
    amount,
    date: dates[i + 1],
    installmentNumber: i + 2,
    parentTransactionId: parent.id,
  }));

  const children = childValues.length > 0
    ? await tx.insert(transactions).values(childValues).returning()
    : [];

  // Balance updates
  const balanceAmount = isCreditCard ? totalAmount : amounts[0];
  const balanceChange = type === "income" ? balanceAmount : -Math.abs(balanceAmount);

  await tx
    .update(financialAccounts)
    .set({
      balance: sql`${financialAccounts.balance} + ${balanceChange}`,
      updatedAt: new Date(),
    })
    .where(eq(financialAccounts.id, accountId));

  if (type === "transfer" && toAccountId) {
    const destAmount = isCreditCard ? Math.abs(totalAmount) : Math.abs(amounts[0]);
    await tx
      .update(financialAccounts)
      .set({
        balance: sql`${financialAccounts.balance} + ${destAmount}`,
        updatedAt: new Date(),
      })
      .where(eq(financialAccounts.id, toAccountId));
  }

  return [parent, ...children];
}

/**
 * Mark pending installments as `cleared` for the closed billing cycle of a
 * credit card — used when the corresponding bill is paid (either by the
 * auto-pay job or by a manual transfer confirmation).
 *
 * MUST be called from inside a `db.transaction(...)` block — pass the inner
 * `tx`. `referenceDate` should be the payment date (used to resolve which
 * cycle is currently closed).
 */
export async function matureInstallmentsForCreditCardCycle(
  tx: DbOrTx,
  params: { creditCardAccountId: string; closingDay: number; referenceDate: Date }
) {
  const cycle = getClosedBillDates(params.closingDay, params.referenceDate);

  await tx
    .update(transactions)
    .set({ status: "cleared", updatedAt: new Date() })
    .where(
      and(
        eq(transactions.accountId, params.creditCardAccountId),
        eq(transactions.isInstallment, true),
        eq(transactions.status, "pending"),
        gte(transactions.date, cycle.start),
        lte(transactions.date, cycle.end),
      )
    );
}
