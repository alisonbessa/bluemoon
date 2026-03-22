/**
 * Expenses Feature Types
 */

export interface ExpenseAccount {
  id: string;
  name: string;
  type: string;
  icon?: string | null;
}

export interface ExpenseCategory {
  id: string;
  name: string;
  icon?: string | null;
}

export interface RecurringBillSummary {
  id: string;
  name: string;
  amount: number;
  frequency: 'weekly' | 'monthly' | 'yearly';
  dueDay: number | null;
  dueMonth: number | null;
  accountId: string;
  isAutoDebit: boolean;
  isVariable: boolean;
}
