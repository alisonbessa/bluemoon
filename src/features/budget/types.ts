/**
 * Budget Feature Types
 *
 * Central type definitions for the budget feature.
 */

// Re-export formatter utility
export { formatCurrency } from '@/shared/lib/formatters';

// Budget domain types
export interface Budget {
  id: string;
  name: string;
  description?: string | null;
  currency: string;
  privacyMode?: string | null;
  createdAt: Date;
}

export interface BudgetWithMembership extends Budget {
  memberType: 'owner' | 'member';
}

export type BudgetMemberType = 'owner' | 'member';

// Re-export from central types - Category domain
export type {
  Category,
  CategoryAllocation,
  Group,
  GroupData,
  FilterType,
  RecurringBillSummary,
} from '@/features/categories';

export const MONTH_NAMES_PT = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

export { MONTH_NAMES_PT as monthNamesFull };

// Re-export from central types - Income domain
export type {
  IncomeSource,
  IncomeSourceFormData,
  IncomeSourceData,
  IncomeMemberGroup,
  IncomeData,
  IncomeType,
  IncomeFrequency,
} from '@/features/income';

export {
  INCOME_TYPE_CONFIG,
  FREQUENCY_LABELS,
  ALLOWED_ACCOUNT_TYPES_BY_INCOME,
} from '@/features/income';

// Aliases for backward compatibility (camelCase versions)
export { INCOME_TYPE_CONFIG as incomeTypeConfig } from '@/features/income';
export { FREQUENCY_LABELS as frequencyLabels } from '@/features/income';

// Re-export from central types - Account domain
export type { AccountSimple as Account } from '@/features/accounts';

// Re-export from central types - Member domain
export type { MemberSummary as Member } from '@/types/member';

// Re-export from central types - Goal domain
export type { Goal } from '@/features/goals';

// Group colors for comparison charts (specific to budget UI)
export const GROUP_COLORS: Record<string, string> = {
  essential: '#ef4444', // red-500
  lifestyle: '#f97316', // orange-500
  pleasures: '#eab308', // yellow-500
  goals: '#8b5cf6', // violet-500
  investments: '#22c55e', // green-500
};
