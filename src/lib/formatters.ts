/**
 * Formatting Utilities
 *
 * Centralized formatting functions used across the application.
 * All monetary values are stored in cents for precision.
 */

/**
 * Format cents to Brazilian Real currency string
 */
export function formatCurrency(
  cents: number,
  options?: { showSign?: boolean; decimals?: number }
): string {
  const value = cents / 100;
  const decimalDigits = options?.decimals ?? 2;
  const formatted = value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: decimalDigits,
    maximumFractionDigits: decimalDigits,
  });

  if (options?.showSign && cents > 0) {
    return `+${formatted}`;
  }

  return formatted;
}

/**
 * Format cents to simple number string (without currency symbol)
 */
export function formatAmount(cents: number): string {
  const value = cents / 100;
  return value.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Parse Brazilian currency string to cents
 */
export function parseCurrencyToCents(value: string): number {
  const cleanValue = value.replace(/[^\d,-]/g, '').replace(',', '.');
  return Math.round(parseFloat(cleanValue || '0') * 100);
}

/**
 * Alias for parseCurrencyToCents for backward compatibility
 */
export const parseCurrency = parseCurrencyToCents;

/**
 * Format cents to compact number string (without currency symbol)
 * Alias for formatAmount for semantic clarity
 */
export const formatCurrencyCompact = formatAmount;

// Maximum value in cents (R$ 10,000,000,000.00 = 1 trillion cents)
// Using bigint in database to support this range
const MAX_CENTS = 1_000_000_000_000;

/**
 * Format currency input from raw digit string
 * Used for live-formatting as user types in currency inputs
 * Example: "12345" -> "123,45"
 * Limits to MAX_CENTS to prevent PostgreSQL integer overflow
 */
export function formatCurrencyFromDigits(digits: string): string {
  const onlyDigits = digits.replace(/\D/g, '');
  const cents = Math.min(parseInt(onlyDigits || '0', 10), MAX_CENTS);
  return formatAmount(cents);
}

/**
 * Format percentage value
 */
export function formatPercentage(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)}%`;
}

/**
 * Format date to Brazilian format
 */
export function formatDate(date: Date | string, options?: Intl.DateTimeFormatOptions): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('pt-BR', options ?? {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

/**
 * Format date to short format (e.g., "15 Jan")
 */
export function formatDateShort(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('pt-BR', {
    day: 'numeric',
    month: 'short',
  });
}

/**
 * Format relative time (e.g., "2 days ago")
 */
export function formatRelativeTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffInMs = now.getTime() - d.getTime();
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

  if (diffInDays === 0) return 'Hoje';
  if (diffInDays === 1) return 'Ontem';
  if (diffInDays < 7) return `${diffInDays} dias atrás`;
  if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} semanas atrás`;
  if (diffInDays < 365) return `${Math.floor(diffInDays / 30)} meses atrás`;
  return `${Math.floor(diffInDays / 365)} anos atrás`;
}

// Re-export string utilities for backward compatibility
export { capitalizeWords, truncate } from './string-utils';
