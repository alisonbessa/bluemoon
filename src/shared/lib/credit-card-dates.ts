/**
 * Calculate the invoice date for a credit card purchase.
 *
 * Brazilian credit cards work like this:
 * - closingDay: the day of the month the invoice closes (e.g., day 15)
 * - If a purchase happens BEFORE or ON the closing day, it falls in the CURRENT month's invoice
 * - If a purchase happens AFTER the closing day, it falls in the NEXT month's invoice
 *
 * For installments, each subsequent installment falls in the next month's invoice.
 *
 * Example: closingDay = 15
 * - Purchase on Jan 10 → 1st installment in Jan invoice, 2nd in Feb, etc.
 * - Purchase on Jan 20 → 1st installment in Feb invoice, 2nd in Mar, etc.
 */
export function calculateInstallmentDates(
  purchaseDate: Date,
  totalInstallments: number,
  closingDay: number | null
): Date[] {
  const dates: Date[] = [];

  if (!closingDay) {
    // No closing day configured - use simple monthly spacing (old behavior)
    for (let i = 0; i < totalInstallments; i++) {
      const date = new Date(purchaseDate);
      date.setMonth(date.getMonth() + i);
      dates.push(date);
    }
    return dates;
  }

  // Determine which invoice the first installment falls into
  const purchaseDay = purchaseDate.getDate();
  const purchaseMonth = purchaseDate.getMonth();
  const purchaseYear = purchaseDate.getFullYear();

  // If purchase is AFTER closing day, first installment goes to NEXT month's invoice
  let firstInvoiceMonth: number;
  let firstInvoiceYear: number;

  if (purchaseDay > closingDay) {
    // Purchase after closing → next month's invoice
    firstInvoiceMonth = purchaseMonth + 1;
    firstInvoiceYear = purchaseYear;
    if (firstInvoiceMonth > 11) {
      firstInvoiceMonth = 0;
      firstInvoiceYear++;
    }
  } else {
    // Purchase on or before closing → current month's invoice
    firstInvoiceMonth = purchaseMonth;
    firstInvoiceYear = purchaseYear;
  }

  // Generate dates for each installment
  // Each installment date is set to the closing day of its respective invoice month
  for (let i = 0; i < totalInstallments; i++) {
    let month = firstInvoiceMonth + i;
    let year = firstInvoiceYear;

    // Handle year overflow
    while (month > 11) {
      month -= 12;
      year++;
    }

    // Use closing day as the date, clamped to the last day of the month
    const lastDayOfMonth = new Date(year, month + 1, 0).getDate();
    const day = Math.min(closingDay, lastDayOfMonth);

    // Set time to noon UTC to avoid timezone issues
    const date = new Date(Date.UTC(year, month, day, 12, 0, 0));
    dates.push(date);
  }

  return dates;
}

/**
 * Calculate the single transaction date for a non-installment credit card purchase.
 * Same logic as installments but for a single purchase.
 */
export function calculateCreditCardTransactionDate(
  purchaseDate: Date,
  closingDay: number | null
): Date {
  return calculateInstallmentDates(purchaseDate, 1, closingDay)[0];
}
