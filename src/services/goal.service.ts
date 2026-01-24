/**
 * Goal Service
 *
 * Centralized service for goal-related API calls.
 * Follows Clean Architecture by separating data access from UI.
 */

import type { Goal } from '@/types';
import type { GoalFormData } from '@/features/goals';

interface GoalResponse {
  goals: Goal[];
}

interface BudgetResponse {
  budgets: { id: string; name: string }[];
}

interface ContributeResponse {
  justCompleted: boolean;
  goal: Goal;
}

export const goalService = {
  /**
   * Fetch all goals
   */
  async getGoals(): Promise<GoalResponse> {
    const response = await fetch('/api/app/goals');
    if (!response.ok) throw new Error('Failed to fetch goals');
    return response.json();
  },

  /**
   * Fetch budgets for goal creation
   */
  async getBudgets(): Promise<BudgetResponse> {
    const response = await fetch('/api/app/budgets');
    if (!response.ok) throw new Error('Failed to fetch budgets');
    return response.json();
  },

  /**
   * Create a new goal
   */
  async createGoal(
    data: GoalFormData & { budgetId: string }
  ): Promise<Goal> {
    const payload = {
      ...data,
      targetAmount: Math.round(data.targetAmount * 100),
    };

    const response = await fetch('/api/app/goals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create goal');
    }

    return response.json();
  },

  /**
   * Update an existing goal
   */
  async updateGoal(
    id: string,
    data: GoalFormData & { budgetId: string }
  ): Promise<Goal> {
    const payload = {
      ...data,
      targetAmount: Math.round(data.targetAmount * 100),
    };

    const response = await fetch(`/api/app/goals/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to update goal');
    }

    return response.json();
  },

  /**
   * Archive (soft delete) a goal
   */
  async archiveGoal(id: string): Promise<void> {
    const response = await fetch(`/api/app/goals/${id}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to archive goal');
    }
  },

  /**
   * Contribute to a goal
   */
  async contributeToGoal(
    id: string,
    amount: number,
    year: number,
    month: number
  ): Promise<ContributeResponse> {
    const response = await fetch(`/api/app/goals/${id}/contribute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount: Math.round(amount * 100),
        year,
        month,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to contribute');
    }

    return response.json();
  },
};
