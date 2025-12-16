/**
 * Goal Domain Types
 */

export interface Goal {
  id: string;
  name: string;
  icon: string;
  color: string;
  targetAmount: number;
  currentAmount: number;
  progress: number;
  monthlyTarget: number;
  monthsRemaining: number;
  isCompleted: boolean;
  targetDate?: Date | null;
  createdAt: Date;
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
