/**
 * Budget Component Types
 *
 * @deprecated Import from '@/features/budget' instead
 * This file re-exports from the new FSD location for backwards compatibility
 */

export {
  // Utilities
  formatCurrency,
  // Budget types
  type Budget,
  type BudgetWithMembership,
  type BudgetMemberType,
  // Category types
  type Category,
  type CategoryAllocation,
  type Group,
  type GroupData,
  type FilterType,
  type RecurringBillSummary,
  GROUP_DEFAULT_BEHAVIORS,
  MONTH_NAMES_PT,
  monthNamesFull,
  // Income types
  type IncomeSource,
  type IncomeSourceFormData,
  type IncomeSourceData,
  type IncomeMemberGroup,
  type IncomeData,
  type IncomeType,
  type IncomeFrequency,
  INCOME_TYPE_CONFIG,
  FREQUENCY_LABELS,
  ALLOWED_ACCOUNT_TYPES_BY_INCOME,
  incomeTypeConfig,
  frequencyLabels,
  // Account types
  type Account,
  // Member types
  type Member,
  // Goal types
  type Goal,
  // UI Constants
  GROUP_COLORS,
} from '@/features/budget';
