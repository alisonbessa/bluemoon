/**
 * Member Domain Types
 */

/**
 * Simplified member type for list displays
 */
export interface MemberSummary {
  id: string;
  name: string;
  color: string | null;
}

/**
 * Full member type with all properties
 */
export interface Member extends MemberSummary {
  userId?: string | null;
  budgetId: string;
  type: 'owner' | 'member';
  createdAt: Date;
}

export interface MemberFormData {
  name: string;
  color?: string;
}
