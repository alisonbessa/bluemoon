/**
 * Centralized SWR Data Hooks
 *
 * These hooks provide cached, deduplicated data fetching across the application.
 * Using SWR ensures that:
 * - Same data is shared across components
 * - Requests are deduplicated within 60 seconds
 * - Data is automatically revalidated when stale
 */

export { useBudgets, usePrimaryBudget } from './use-budgets';
export { useAccounts, useActiveAccounts } from './use-accounts';
export { useCategories, useFlatCategories } from './use-categories';
export { useGoals, useActiveGoals, useCompletedGoals } from './use-goals';
export { useIncomeSources, useIncomeSourcesByMember } from './use-income-sources';
export { useMembers } from './use-members';
export type { Member } from './use-members';
export { useAllocations, useCurrentMonthAllocations } from './use-allocations';
export { useRecurringBills, useCategoryRecurringBills } from './use-recurring-bills';
export type { RecurringBill } from './use-recurring-bills';
