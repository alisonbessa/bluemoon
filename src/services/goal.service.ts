/**
 * Goal Service
 *
 * Centralized service for goal-related API calls.
 * Follows Clean Architecture by separating data access from UI.
 */

import type { Goal } from "@/types";
import type { GoalFormData } from "@/features/goals";
import { apiFetch } from "@/shared/lib/api/client";

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
    return apiFetch<GoalResponse>("/api/app/goals");
  },

  /**
   * Fetch budgets for goal creation
   */
  async getBudgets(): Promise<BudgetResponse> {
    return apiFetch<BudgetResponse>("/api/app/budgets");
  },

  /**
   * Create a new goal
   */
  async createGoal(data: GoalFormData & { budgetId: string }): Promise<Goal> {
    const payload = {
      ...data,
      targetAmount: Math.round(data.targetAmount * 100),
    };

    return apiFetch<Goal>("/api/app/goals", {
      method: "POST",
      body: JSON.stringify(payload),
    });
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

    return apiFetch<Goal>(`/api/app/goals/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },

  /**
   * Archive (soft delete) a goal
   */
  async archiveGoal(id: string): Promise<void> {
    await apiFetch<void>(`/api/app/goals/${id}`, {
      method: "DELETE",
    });
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
    return apiFetch<ContributeResponse>(`/api/app/goals/${id}/contribute`, {
      method: "POST",
      body: JSON.stringify({
        amount: Math.round(amount * 100),
        year,
        month,
      }),
    });
  },
};
