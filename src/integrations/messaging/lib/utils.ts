/**
 * Messaging Utility Functions (shared between platforms)
 */

/**
 * Get today's date at noon UTC
 * This avoids timezone display issues where 02:00 UTC could show as previous day in Brazil (UTC-3)
 */
export function getTodayNoonUTC(): Date {
  const today = new Date();
  return new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate(), 12, 0, 0));
}

/**
 * Parse amount from text input
 * Supports formats: "50", "50,00", "50.00", "R$ 50,00"
 * Returns amount in cents
 */
export function parseAmount(text: string): number | null {
  // Remove currency symbol and spaces
  let cleaned = text.replace(/R\$\s*/gi, '').trim();

  // Replace comma with dot for decimal
  cleaned = cleaned.replace(',', '.');

  const amount = parseFloat(cleaned);

  if (isNaN(amount) || amount <= 0) {
    return null;
  }

  // Convert to cents
  return Math.round(amount * 100);
}

/**
 * Format installment month names for display
 * e.g. 3 installments from Feb 2026 → "(fev, mar, abr)"
 */
export function formatInstallmentMonths(totalInstallments: number): string {
  const now = new Date();
  const months: string[] = [];
  for (let i = 0; i < totalInstallments; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    months.push(d.toLocaleDateString("pt-BR", { month: "short" }).replace(".", ""));
  }
  return `(${months.join(", ")})`;
}

/**
 * Extract amount and description from text
 */
export function parseExpenseInput(text: string): {
  amount: number | null;
  description?: string;
} {
  const parts = text.trim().split(/\s+/);
  const amountText = parts[0];
  const description = parts.slice(1).join(' ') || undefined;

  return {
    amount: parseAmount(amountText),
    description,
  };
}
