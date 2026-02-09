/**
 * Billing cycle utilities for credit card accounts.
 *
 * A billing cycle for month M runs from closingDay+1 of month M-1 to closingDay of month M.
 * Example with closingDay=20:
 *   - January cycle: Dec 21 → Jan 20
 *   - February cycle: Jan 21 → Feb 20
 *
 * Transactions after the closing day fall into the NEXT month's cycle.
 */

/**
 * Clamp a day to the last valid day of a given month.
 * e.g. closingDay=31 in February → 28 (or 29 in leap year)
 */
function clampDay(year: number, month: number, day: number): number {
  const lastDay = new Date(year, month, 0).getDate(); // month is 1-indexed here (Jan=1)
  return Math.min(day, lastDay);
}

/**
 * Get the start and end dates of a billing cycle for a given month.
 *
 * @param closingDay - Day of month when the bill closes (1-31)
 * @param year - Year
 * @param month - Month (1-12, January=1)
 * @returns { start, end } - Start is closingDay+1 of previous month, end is closingDay of current month
 */
export function getBillingCycleDates(
  closingDay: number,
  year: number,
  month: number
): { start: Date; end: Date } {
  // End of cycle: closingDay of the given month
  const endDay = clampDay(year, month, closingDay);
  const end = new Date(year, month - 1, endDay, 23, 59, 59, 999);

  // Start of cycle: closingDay+1 of previous month
  let prevMonth = month - 1;
  let prevYear = year;
  if (prevMonth < 1) {
    prevMonth = 12;
    prevYear = year - 1;
  }
  const startDay = clampDay(prevYear, prevMonth, closingDay) + 1;

  // If startDay exceeds the month's days, it rolls to next month day 1
  // which is exactly the first day of the current month
  const lastDayPrevMonth = new Date(prevYear, prevMonth, 0).getDate();
  let start: Date;
  if (startDay > lastDayPrevMonth) {
    start = new Date(year, month - 1, 1, 0, 0, 0, 0);
  } else {
    start = new Date(prevYear, prevMonth - 1, startDay, 0, 0, 0, 0);
  }

  return { start, end };
}

/**
 * Determine which billing cycle (month/year) a transaction date falls into.
 *
 * If the transaction day is AFTER the closingDay, it belongs to the NEXT month's cycle.
 * If the transaction day is ON or BEFORE the closingDay, it belongs to the CURRENT month's cycle.
 *
 * Works for both installment and non-installment purchases.
 *
 * @param transactionDate - The date of the transaction
 * @param closingDay - Day of month when the bill closes (1-31)
 * @returns { year, month } - The billing cycle month (1-12) and year
 */
export function getTransactionBillingMonth(
  transactionDate: Date,
  closingDay: number
): { year: number; month: number } {
  const txDay = transactionDate.getDate();
  const txMonth = transactionDate.getMonth() + 1; // 1-indexed
  const txYear = transactionDate.getFullYear();

  // Clamp closingDay to the actual last day of the transaction's month
  const lastDayOfMonth = new Date(txYear, txMonth, 0).getDate();
  const effectiveClosingDay = Math.min(closingDay, lastDayOfMonth);

  if (txDay > effectiveClosingDay) {
    // Transaction is after closing → belongs to next month's cycle
    let nextMonth = txMonth + 1;
    let nextYear = txYear;
    if (nextMonth > 12) {
      nextMonth = 1;
      nextYear = txYear + 1;
    }
    return { year: nextYear, month: nextMonth };
  }

  // Transaction is on or before closing → belongs to current month's cycle
  return { year: txYear, month: txMonth };
}

/**
 * Calculate dates for all installments starting from the first installment date.
 * Each subsequent installment is +1 month from the previous.
 *
 * Preserves the day-of-month, clamping to the last day when needed.
 * e.g. Jan 31 → Feb 28, Mar 31, Apr 30, etc.
 *
 * @param firstDate - Date of the first installment
 * @param totalInstallments - Total number of installments
 * @returns Array of dates, one per installment
 */
export function calculateInstallmentDates(
  firstDate: Date,
  totalInstallments: number
): Date[] {
  const dates: Date[] = [];
  const baseDay = firstDate.getDate();
  const baseMonth = firstDate.getMonth();
  const baseYear = firstDate.getFullYear();
  const hours = firstDate.getHours();
  const minutes = firstDate.getMinutes();

  for (let i = 0; i < totalInstallments; i++) {
    let targetMonth = baseMonth + i;
    let targetYear = baseYear;

    // Handle year overflow
    while (targetMonth > 11) {
      targetMonth -= 12;
      targetYear += 1;
    }

    // Clamp day to last day of target month
    const lastDay = new Date(targetYear, targetMonth + 1, 0).getDate();
    const day = Math.min(baseDay, lastDay);

    dates.push(new Date(targetYear, targetMonth, day, hours, minutes, 0, 0));
  }

  return dates;
}

/**
 * Get the first installment date for a credit card purchase,
 * taking the billing cycle into account.
 *
 * @param purchaseDate - When the purchase was made
 * @param closingDay - Credit card closing day
 * @returns The date to assign to the first installment
 */
export function getFirstInstallmentDate(
  purchaseDate: Date,
  closingDay: number
): Date {
  const billingMonth = getTransactionBillingMonth(purchaseDate, closingDay);

  // Set the date to the closing day of the billing month
  // This represents "this installment belongs to this billing cycle"
  const day = clampDay(billingMonth.year, billingMonth.month, closingDay);

  return new Date(
    billingMonth.year,
    billingMonth.month - 1,
    day,
    purchaseDate.getHours(),
    purchaseDate.getMinutes(),
    0,
    0
  );
}
