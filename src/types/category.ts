/**
 * Category Domain Types
 */

export type CategoryBehavior = 'set_aside' | 'refill_up';

export interface Category {
  id: string;
  name: string;
  icon?: string | null;
  behavior: CategoryBehavior;
  plannedAmount: number;
  groupId: string;
  budgetId: string;
}

export interface CategoryAllocation {
  category: Category;
  allocated: number;
  carriedOver: number;
  spent: number;
  available: number;
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
