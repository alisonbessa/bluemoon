/**
 * Budget Component Types
 * Re-exports from centralized types for backwards compatibility
 */

// Re-export formatter utility
export { formatCurrency } from "@/shared/lib/formatters";

// Re-export from central types - Category domain
export type {
  Category,
  CategoryAllocation,
  Group,
  GroupData,
  FilterType,
  RecurringBillSummary,
} from "@/types/category";

export {
  GROUP_DEFAULT_BEHAVIORS,
  MONTH_NAMES_PT,
} from "@/types/category";

// Alias for backward compatibility
export { MONTH_NAMES_PT as monthNamesFull } from "@/types/category";

// Re-export from central types - Income domain
export type {
  IncomeSource,
  IncomeSourceFormData,
  IncomeSourceData,
  IncomeMemberGroup,
  IncomeData,
  IncomeType,
  IncomeFrequency,
} from "@/types/income";

export {
  INCOME_TYPE_CONFIG,
  FREQUENCY_LABELS,
  ALLOWED_ACCOUNT_TYPES_BY_INCOME,
} from "@/types/income";

// Aliases for backward compatibility (camelCase versions)
export { INCOME_TYPE_CONFIG as incomeTypeConfig } from "@/types/income";
export { FREQUENCY_LABELS as frequencyLabels } from "@/types/income";

// Re-export from central types - Budget domain
export type { Budget } from "@/types/budget";

// Re-export from central types - Account domain
export type { AccountSimple as Account } from "@/types/account";

// Re-export from central types - Member domain
export type { MemberSummary as Member } from "@/types/member";

// Re-export from central types - Goal domain
export type { Goal } from "@/types/goal";

// Group colors for comparison charts (specific to budget UI)
export const GROUP_COLORS: Record<string, string> = {
  essential: "#ef4444", // red-500
  lifestyle: "#f97316", // orange-500
  pleasures: "#eab308", // yellow-500
  goals: "#8b5cf6", // violet-500
  investments: "#22c55e", // green-500
};
