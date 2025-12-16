/**
 * Account Domain Types
 */

export type AccountType = 'checking' | 'savings' | 'credit_card' | 'cash' | 'investment' | 'benefit';

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  icon?: string | null;
  balance: number;
  creditLimit?: number | null;
  closingDay?: number | null;
  dueDay?: number | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface AccountFormData {
  name: string;
  type: AccountType;
  icon?: string;
  balance?: number;
  creditLimit?: number;
  closingDay?: number;
  dueDay?: number;
}

export const ACCOUNT_TYPE_CONFIG: Record<AccountType, { label: string; icon: string }> = {
  checking: { label: 'Conta Corrente', icon: '🏦' },
  savings: { label: 'Poupança', icon: '🐷' },
  credit_card: { label: 'Cartão de Crédito', icon: '💳' },
  cash: { label: 'Dinheiro', icon: '💵' },
  investment: { label: 'Investimento', icon: '📈' },
  benefit: { label: 'Benefício', icon: '🎁' },
};
