/**
 * Hooks Index
 *
 * Re-exports all hooks for convenient imports.
 * Usage: import { useUser, useIsMobile } from '@/hooks';
 */

// User & Authentication
export {
  useCurrentUser,
  useUser,
  useCurrentPlan,
  useCredits,
} from './use-current-user';

// Centralized SWR data hooks
export {
  useBudgets,
  usePrimaryBudget,
  useAccounts,
  useActiveAccounts,
  useCategories,
  useFlatCategories,
  useGoals,
  useActiveGoals,
  useCompletedGoals,
  useIncomeSources,
  useIncomeSourcesByMember,
  useMembers,
  useAllocations,
  useCurrentMonthAllocations,
  useRecurringBills,
  useCategoryRecurringBills,
} from './data';

// UI utilities
export { useIsMobile } from './use-mobile';
export { useDebounce } from './use-debounce';
