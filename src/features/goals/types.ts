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
  memberId?: string | null;
  initialAmount?: number;
}

export interface Goal {
  id: string;
  budgetId: string;
  memberId?: string | null;
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
  isOtherMemberGoal?: boolean;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}
