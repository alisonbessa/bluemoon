/**
 * Dashboard Feature Types
 */

export interface DashboardData {
  totalIncome: number;
  totalExpenses: number;
  totalBalance: number;
  monthlyData: MonthlyDataPoint[];
}

export interface MonthlyDataPoint {
  month: string;
  income: number;
  expenses: number;
}

export interface CreditCardData {
  id: string;
  name: string;
  balance: number;
  limit: number;
  icon?: string | null;
}

export interface ScheduledTransaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  status: 'pending' | 'cleared';
}
