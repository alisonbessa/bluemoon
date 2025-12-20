/**
 * Budget Service
 *
 * Centralized service for budget-related API calls.
 * Follows Clean Architecture by separating data access from UI.
 */

import type {
  Budget,
  GroupData,
  IncomeData,
  Goal,
  Category,
  IncomeSource,
  IncomeSourceFormData,
} from '@/types';

interface AllocationResponse {
  groups: GroupData[];
  totals: { allocated: number; spent: number; available: number };
  income: IncomeData;
}

interface BudgetResponse {
  budgets: Budget[];
}

interface MemberResponse {
  members: { id: string; name: string; color: string | null }[];
}

interface AccountResponse {
  accounts: { id: string; name: string; type: string; icon?: string | null }[];
}

interface GoalResponse {
  goals: Goal[];
}

export const budgetService = {
  /**
   * Fetch user's budgets
   */
  async getBudgets(): Promise<BudgetResponse> {
    const response = await fetch('/api/app/budgets');
    if (!response.ok) throw new Error('Failed to fetch budgets');
    return response.json();
  },

  /**
   * Fetch budget members
   */
  async getMembers(): Promise<MemberResponse> {
    const response = await fetch('/api/app/members');
    if (!response.ok) throw new Error('Failed to fetch members');
    return response.json();
  },

  /**
   * Fetch financial accounts
   */
  async getAccounts(): Promise<AccountResponse> {
    const response = await fetch('/api/app/accounts');
    if (!response.ok) throw new Error('Failed to fetch accounts');
    return response.json();
  },

  /**
   * Fetch allocations for a specific month
   */
  async getAllocations(
    budgetId: string,
    year: number,
    month: number
  ): Promise<AllocationResponse> {
    const response = await fetch(
      `/api/app/allocations?budgetId=${budgetId}&year=${year}&month=${month}`
    );
    if (!response.ok) throw new Error('Failed to fetch allocations');
    return response.json();
  },

  /**
   * Fetch goals for a budget
   */
  async getGoals(budgetId: string): Promise<GoalResponse> {
    const response = await fetch(`/api/app/goals?budgetId=${budgetId}`);
    if (!response.ok) throw new Error('Failed to fetch goals');
    return response.json();
  },

  /**
   * Save category allocation
   */
  async saveAllocation(data: {
    budgetId: string;
    categoryId: string;
    year: number;
    month: number;
    allocated: number;
    behavior: 'set_aside' | 'refill_up';
  }): Promise<void> {
    const response = await fetch('/api/app/allocations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to save allocation');
  },

  /**
   * Copy allocations from previous month
   */
  async copyFromPreviousMonth(data: {
    budgetId: string;
    fromYear: number;
    fromMonth: number;
    toYear: number;
    toMonth: number;
    overwrite?: boolean;
  }): Promise<{ copiedCount: number; requiresOverwrite?: boolean }> {
    const response = await fetch('/api/app/allocations/copy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const result = await response.json();
    if (!response.ok) {
      if (result.requiresOverwrite) {
        return { copiedCount: 0, requiresOverwrite: true };
      }
      throw new Error(result.error || 'Failed to copy allocations');
    }
    return result;
  },

  /**
   * Save income allocation
   */
  async saveIncomeAllocation(data: {
    budgetId: string;
    incomeSourceId: string;
    year: number;
    month: number;
    planned: number;
  }): Promise<void> {
    const response = await fetch('/api/app/income-allocations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to save income allocation');
  },

  /**
   * Create category
   */
  async createCategory(data: {
    budgetId: string;
    groupId: string;
    name: string;
    icon?: string | null;
    behavior: 'set_aside' | 'refill_up';
    suggestIcon?: boolean;
  }): Promise<Category> {
    const response = await fetch('/api/app/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create category');
    }
    return response.json();
  },

  /**
   * Update category
   */
  async updateCategory(
    categoryId: string,
    data: { name: string; icon?: string | null }
  ): Promise<void> {
    const response = await fetch(`/api/app/categories/${categoryId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to update category');
    }
  },

  /**
   * Delete category
   */
  async deleteCategory(categoryId: string): Promise<void> {
    const response = await fetch(`/api/app/categories/${categoryId}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to delete category');
    }
  },

  /**
   * Create income source
   */
  async createIncomeSource(
    data: IncomeSourceFormData & { budgetId: string }
  ): Promise<IncomeSource> {
    const response = await fetch('/api/app/income-sources', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to create income source');
    return response.json();
  },

  /**
   * Update income source
   */
  async updateIncomeSource(
    id: string,
    data: IncomeSourceFormData & { budgetId: string }
  ): Promise<void> {
    const response = await fetch(`/api/app/income-sources/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to update income source');
  },

  /**
   * Delete income source
   */
  async deleteIncomeSource(id: string): Promise<void> {
    const response = await fetch(`/api/app/income-sources/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to delete income source');
  },
};
