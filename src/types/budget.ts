/**
 * Budget Domain Types
 */

export interface Budget {
  id: string;
  name: string;
  description?: string | null;
  currency: string;
  createdAt: Date;
}

export interface BudgetWithMembership extends Budget {
  memberType: 'owner' | 'member';
}

export type BudgetMemberType = 'owner' | 'member';
