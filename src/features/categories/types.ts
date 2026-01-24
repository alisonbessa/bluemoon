/**
 * Category Feature Types
 *
 * Central type definitions for the categories feature.
 */

export type CategoryBehavior = 'set_aside' | 'refill_up';

/**
 * Simplified category for selects and lists (minimal fields)
 */
export interface CategorySimple {
  id: string;
  name: string;
  icon?: string | null;
}

export interface Category {
  id: string;
  name: string;
  icon?: string | null;
  behavior: CategoryBehavior;
  plannedAmount: number;
  dueDay?: number | null;
  groupId: string;
  budgetId: string;
}

export interface RecurringBillSummary {
  id: string;
  name: string;
  amount: number;
  frequency: string;
  dueDay: number | null;
  dueMonth: number | null;
  account: { id: string; name: string; icon: string | null } | null;
}

export interface CategoryAllocation {
  category: Category;
  allocated: number;
  carriedOver: number;
  spent: number;
  available: number;
  isOtherMemberCategory?: boolean;
  recurringBills?: RecurringBillSummary[];
}

export interface Group {
  id: string;
  code: string;
  name: string;
  icon?: string | null;
  displayOrder: number;
}

// Group with categories for category management pages
export interface CategoryGroup extends Group {
  description?: string | null;
  categories: Category[];
}

export interface GroupData {
  group: Group;
  categories: CategoryAllocation[];
  totals: {
    allocated: number;
    spent: number;
    available: number;
  };
}

export type FilterType = 'all' | 'underfunded' | 'overfunded' | 'money_available';

export const GROUP_DEFAULT_BEHAVIORS: Record<string, CategoryBehavior> = {
  essential: 'refill_up',
  lifestyle: 'set_aside',
  pleasures: 'set_aside',
  goals: 'set_aside',
  investments: 'set_aside',
};

export const MONTH_NAMES_PT: string[] = [
  'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
  'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez',
];

/**
 * Form data for creating/editing categories
 */
export interface CategoryFormData {
  name: string;
  icon: string;
  groupId: string;
  behavior: CategoryBehavior;
}
