/**
 * Income Feature Types
 *
 * Central type definitions for the income feature.
 */

import type { Member } from '@/types/member';

export type IncomeType = 'salary' | 'benefit' | 'freelance' | 'rental' | 'investment' | 'other';
export type IncomeFrequency = 'monthly' | 'biweekly' | 'weekly';

/**
 * Simplified income source for selects and lists (minimal fields)
 */
export interface IncomeSourceSimple {
  id: string;
  name: string;
  type: string;
  amount: number;
  frequency: string;
}

export interface IncomeSource {
  id: string;
  name: string;
  type: IncomeType;
  amount: number;
  frequency: IncomeFrequency;
  dayOfMonth?: number | null;
  memberId: string | null;
  member?: { id: string; name: string; color?: string | null } | null;
  account?: { id: string; name: string; icon?: string | null } | null;
  isAutoConfirm?: boolean;
}

export interface IncomeSourceData {
  incomeSource: IncomeSource;
  planned: number;
  defaultAmount: number;
  received: number;
}

export interface IncomeMemberGroup {
  member: Member | null;
  sources: IncomeSourceData[];
  totals: { planned: number; received: number };
}

export interface IncomeData {
  byMember: IncomeMemberGroup[];
  totals: { planned: number; received: number };
}

export interface IncomeSourceFormData {
  name: string;
  type: IncomeType;
  amount: number;
  frequency: IncomeFrequency;
  dayOfMonth?: number;
  memberId?: string;
  accountId?: string;
  isAutoConfirm?: boolean;
}

/**
 * Form data for the income form modal (simplified version used by components)
 */
export interface IncomeFormData {
  name: string;
  type: IncomeType;
  amount: number;
  frequency: IncomeFrequency;
  dayOfMonth?: number;
  memberId?: string;
  accountId?: string;
}

export const INCOME_TYPE_CONFIG: Record<IncomeType, { label: string; icon: string }> = {
  salary: { label: 'Salario', icon: '💼' },
  benefit: { label: 'Beneficio', icon: '🎁' },
  freelance: { label: 'Freelance', icon: '💻' },
  rental: { label: 'Aluguel', icon: '🏠' },
  investment: { label: 'Investimento', icon: '📈' },
  other: { label: 'Outros', icon: '📦' },
};

export const FREQUENCY_LABELS: Record<IncomeFrequency, string> = {
  monthly: 'Mensal',
  biweekly: 'Quinzenal',
  weekly: 'Semanal',
};

// Alias for backward compatibility
export const INCOME_FREQUENCY_LABELS = FREQUENCY_LABELS;

// Plural labels for grouping in setup page
export const INCOME_TYPE_CONFIG_PLURAL: Record<IncomeType, { label: string; icon: string }> = {
  salary: { label: 'Salarios', icon: '💼' },
  benefit: { label: 'Beneficios', icon: '🎁' },
  freelance: { label: 'Freelances', icon: '💻' },
  rental: { label: 'Alugueis', icon: '🏠' },
  investment: { label: 'Investimentos', icon: '📈' },
  other: { label: 'Outros', icon: '📦' },
};

export const ALLOWED_ACCOUNT_TYPES_BY_INCOME: Record<IncomeType, string[]> = {
  salary: ['checking', 'savings'],
  freelance: ['checking', 'savings'],
  rental: ['checking', 'savings'],
  investment: ['checking', 'savings', 'investment'],
  benefit: ['benefit'],
  other: ['checking', 'savings', 'credit_card', 'cash', 'investment', 'benefit'],
};
