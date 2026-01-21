/**
 * Goal Domain Types
 *
 * @deprecated Import from '@/features/goals' instead
 * This file re-exports from the new FSD location for backwards compatibility
 */

export { type Goal, type GoalFormData } from '@/features/goals';

// Legacy types kept for API compatibility
export interface CreateGoalInput {
  budgetId: string;
  accountId: string;
  name: string;
  icon?: string;
  color?: string;
  targetAmount: number;
  initialAmount?: number;
  targetDate?: Date | string;
}

export interface GoalContribution {
  goalId: string;
  amount: number;
  description?: string;
}
