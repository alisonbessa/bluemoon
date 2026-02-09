/**
 * Account Feature Types
 *
 * Central type definitions for the accounts feature.
 * Re-exported from the feature's public API.
 */

export type AccountType = 'checking' | 'savings' | 'credit_card' | 'cash' | 'investment' | 'benefit';

/**
 * Account owner information (budget member who owns the account)
 */
export interface AccountOwner {
  id: string;
  name: string;
  type: string;
  color?: string | null;
}

/**
 * Base account interface with all fields from database + computed fields
 */
export interface Account {
  id: string;
  budgetId: string;
  ownerId?: string | null;
  owner?: AccountOwner | null;
  name: string;
  type: AccountType;
  balance: number;
  icon?: string | null;
  color?: string | null;
  creditLimit?: number | null;
  closingDay?: number | null;
  dueDay?: number | null;
  currentBill?: number | null;
  clearedBalance?: number;
  isArchived?: boolean | null;
  displayOrder?: number;
  createdAt?: Date | null;
  updatedAt?: Date | null;
}

/**
 * Simplified account for selects and lists (minimal fields)
 */
export interface AccountSimple {
  id: string;
  name: string;
  type: AccountType | string;
  icon?: string | null;
}

/**
 * Form data for creating/editing accounts
 */
export interface AccountFormData {
  name: string;
  type: AccountType;
  balance: number;
  ownerId?: string;
  creditLimit?: number;
  closingDay?: number;
  dueDay?: number;
  icon?: string;
  color?: string;
}

export const ACCOUNT_TYPE_CONFIG: Record<AccountType, { label: string; icon: string }> = {
  checking: { label: 'Conta Corrente', icon: '🏦' },
  savings: { label: 'Poupança', icon: '🐷' },
  credit_card: { label: 'Cartão de Crédito', icon: '💳' },
  cash: { label: 'Dinheiro', icon: '💵' },
  investment: { label: 'Investimento', icon: '📈' },
  benefit: { label: 'Benefício', icon: '🎁' },
};
