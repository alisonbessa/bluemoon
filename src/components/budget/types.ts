// Budget page types

export interface Category {
  id: string;
  name: string;
  icon?: string | null;
  behavior: "set_aside" | "refill_up";
  plannedAmount: number;
  dueDay?: number | null;
}

export interface Group {
  id: string;
  code: string;
  name: string;
  icon?: string | null;
  displayOrder: number;
}

export interface CategoryAllocation {
  category: Category;
  allocated: number;
  carriedOver: number;
  spent: number;
  available: number;
}

export interface GroupData {
  group: Group;
  categories: CategoryAllocation[];
  totals: {
    allocated: number;
    spent: number;
    available: number;
  };
}

export interface Budget {
  id: string;
  name: string;
}

export interface IncomeSource {
  id: string;
  name: string;
  type: "salary" | "benefit" | "freelance" | "rental" | "investment" | "other";
  amount: number;
  frequency: "monthly" | "biweekly" | "weekly";
  dayOfMonth?: number | null;
  memberId: string | null;
  member?: { id: string; name: string; color?: string | null } | null;
  account?: { id: string; name: string; icon?: string | null } | null;
}

export interface Account {
  id: string;
  name: string;
  type: string;
  icon?: string | null;
}

export interface IncomeSourceFormData {
  name: string;
  type: "salary" | "benefit" | "freelance" | "rental" | "investment" | "other";
  amount: number;
  frequency: "monthly" | "biweekly" | "weekly";
  dayOfMonth?: number;
  memberId?: string;
  accountId?: string;
}

export interface Member {
  id: string;
  name: string;
  color: string | null;
}

export interface IncomeSourceData {
  incomeSource: IncomeSource;
  planned: number;
  defaultAmount: number;
  received: number;
}

export interface IncomeMemberGroup {
  member: Member | null;
  sources: IncomeSourceData[];
  totals: { planned: number; received: number };
}

export interface IncomeData {
  byMember: IncomeMemberGroup[];
  totals: { planned: number; received: number };
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

export type FilterType = "all" | "underfunded" | "overfunded" | "money_available";

// Helper functions
export function formatCurrency(cents: number): string {
  const value = cents / 100;
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  });
}

export const monthNamesFull = [
  "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
  "Jul", "Ago", "Set", "Out", "Nov", "Dez",
];

export const incomeTypeConfig: Record<string, { label: string; icon: string }> = {
  salary: { label: "Salário", icon: "💼" },
  benefit: { label: "Benefício", icon: "🎁" },
  freelance: { label: "Freelance", icon: "💻" },
  rental: { label: "Aluguel", icon: "🏠" },
  investment: { label: "Investimento", icon: "📈" },
  other: { label: "Outros", icon: "📦" },
};

export const frequencyLabels: Record<string, string> = {
  monthly: "Mensal",
  biweekly: "Quinzenal",
  weekly: "Semanal",
};

// Account types allowed for each income type
export const ALLOWED_ACCOUNT_TYPES_BY_INCOME: Record<string, string[]> = {
  salary: ["checking", "savings"],
  freelance: ["checking", "savings"],
  rental: ["checking", "savings"],
  investment: ["checking", "savings", "investment"],
  benefit: ["benefit"],
  other: ["checking", "savings", "credit_card", "cash", "investment", "benefit"],
};

// Mapping of group codes to default behaviors
export const GROUP_DEFAULT_BEHAVIORS: Record<string, "set_aside" | "refill_up"> = {
  essential: "refill_up",
  lifestyle: "set_aside",
  pleasures: "set_aside",
  goals: "set_aside",
  investments: "set_aside",
};

// Group colors for comparison charts
export const GROUP_COLORS: Record<string, string> = {
  essential: "#ef4444", // red-500
  lifestyle: "#f97316", // orange-500
  pleasures: "#eab308", // yellow-500
  goals: "#8b5cf6", // violet-500
  investments: "#22c55e", // green-500
};
