/**
 * Goal Domain Types
 */

export interface Goal {
  id: string;
  budgetId: string;
  name: string;
  icon: string;
  color: string;
  targetAmount: number;
  currentAmount: number;
  targetDate: string;
  isCompleted: boolean;
  completedAt: string | null;
  isArchived: boolean;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
  // Calculated metrics
  progress: number;
  monthsRemaining: number;
  monthlyTarget: number;
  remaining: number;
}

export interface CreateGoalInput {
  budgetId: string;
  name: string;
  icon?: string;
  color?: string;
  targetAmount: number;
  targetDate?: Date | string;
}

export interface GoalContribution {
  goalId: string;
  amount: number;
  description?: string;
}
