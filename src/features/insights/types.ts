export interface InsightsMonth {
  year: number;
  month: number;
  daysInMonth: number;
  dayOfMonth: number;
  isCurrentMonth: boolean;
}

export interface InsightsSummary {
  income: number;
  expense: number;
  savings: number;
  transactionCount: number;
  totalAllocated: number;
}

export interface BudgetHealth {
  spentPercent: number;
  monthProgress: number;
  healthRatio: number;
  status: "excellent" | "good" | "warning" | "critical";
}

export interface Projection {
  dailyAvgExpense: number;
  projectedExpense: number;
  projectedSavings: number;
  isOnTrack: boolean;
}

export interface TopCategory {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
  groupName: string;
  groupCode: string;
  spent: number;
  allocated: number;
  percentOfTotal: number;
  variation: number | null;
}

export interface OverBudgetCategory {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
  allocated: number;
  spent: number;
  overAmount: number;
  overPercent: number;
}

export interface ComparisonItem {
  current: number;
  previous: number;
  variation: number | null;
}

export interface MonthComparison {
  income: ComparisonItem;
  expense: ComparisonItem;
  savings: ComparisonItem;
}

export interface InsightsData {
  month: InsightsMonth;
  summary: InsightsSummary;
  budgetHealth: BudgetHealth;
  projection: Projection;
  topCategories: TopCategory[];
  overBudgetCategories: OverBudgetCategory[];
  comparison: MonthComparison;
}
