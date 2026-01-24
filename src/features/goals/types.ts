/**
 * Goals Feature Types
 */

export interface GoalFormData {
  name: string;
  icon: string;
  color: string;
  targetAmount: number;
  targetDate: string;
  accountId?: string;
  initialAmount?: number;
}

export interface Goal {
  id: string;
  budgetId: string;
  accountId?: string;
  name: string;
  icon: string;
  color: string;
  targetAmount: number;
  currentAmount: number;
  progress: number;
  monthlyTarget: number;
  monthsRemaining: number;
  remaining: number;
  targetDate: string;
  isCompleted: boolean;
  completedAt?: string | null;
  isArchived: boolean;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}
