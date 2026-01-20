/**
 * Goals Feature Types
 */

export interface GoalFormData {
  name: string;
  icon: string;
  color: string;
  targetAmount: number;
  targetDate: string;
}

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
  targetDate?: string;
  isCompleted: boolean;
}
