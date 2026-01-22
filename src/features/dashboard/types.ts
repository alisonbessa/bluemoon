/**
 * Dashboard Feature Types
 */

export interface Commitment {
  id: string;
  name: string;
  icon: string | null;
  targetDate: string;
  allocated: number;
  group: {
    id: string;
    name: string;
    code: string;
  };
}

export interface Budget {
  id: string;
  name: string;
}

export interface MonthSummary {
  income: { planned: number; received: number };
  expenses: { allocated: number; spent: number };
  available: number;
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
  isCompleted: boolean;
}

export interface DailyChartData {
  day: number;
  date: string;
  income: number;
  expense: number;
  balance: number;
  pendingIncome?: number;
  pendingExpense?: number;
  pendingBalance?: number;
}

export interface MonthlyChartData {
  month: string;
  year: number;
  label: string;
  income: number;
  expense: number;
}

export interface CreditCard {
  id: string;
  name: string;
  icon: string | null;
  creditLimit: number;
  spent: number;
  available: number;
}

export interface DashboardData {
  budgets: Budget[];
  monthSummary: MonthSummary | null;
  commitments: Commitment[];
  goals: Goal[];
  dailyChartData: DailyChartData[];
  monthlyChartData: MonthlyChartData[];
  creditCards: CreditCard[];
}

// Legacy exports for compatibility
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
