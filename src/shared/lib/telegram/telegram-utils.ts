/**
 * Telegram Utility Functions
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
