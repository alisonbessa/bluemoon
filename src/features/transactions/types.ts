// =============================================================================
// Tipos de Domínio - Transactions Module
// =============================================================================

export interface Category {
  id: string;
  name: string;
  icon?: string | null;
}

export interface Account {
  id: string;
  name: string;
  type: string;
  icon?: string | null;
}

export interface IncomeSource {
  id: string;
  name: string;
  type: string;
}

/**
 * Transaction-specific types
 */
export interface Transaction {
  id: string;
  date: string;
  description?: string | null;
  amount: number;
  type: "income" | "expense" | "transfer";
  categoryId?: string | null;
  incomeSourceId?: string | null;
  recurringBillId?: string | null;
  goalId?: string | null;
  accountId: string;
  toAccountId?: string | null;
  status: string;
  isInstallment?: boolean;
  installmentNumber?: number | null;
  totalInstallments?: number | null;
  parentTransactionId?: string | null;
  account?: Account | null;
  toAccount?: Account | null;
  category?: Category | null;
  incomeSource?: IncomeSource | null;
}

export interface Budget {
  id: string;
  name: string;
}

// =============================================================================
// Tipos de Formulário
// =============================================================================

export type TransactionType = "income" | "expense" | "transfer";

export interface TransactionFormData {
  type: TransactionType;
  amount: string;
  description: string;
  accountId: string;
  categoryId: string;
  incomeSourceId: string;
  toAccountId: string;
  date: string;
  isInstallment: boolean;
  totalInstallments: number;
}

export const initialFormData: TransactionFormData = {
  type: "expense",
  amount: "",
  description: "",
  accountId: "",
  categoryId: "",
  incomeSourceId: "",
  toAccountId: "",
  date: new Date().toISOString().split("T")[0],
  isInstallment: false,
  totalInstallments: 2,
};

// =============================================================================
// Tipos de Filtro
// =============================================================================

export type TypeFilter = "all" | "income" | "expense" | "transfer";

export interface FilterChip {
  key: string;
  label: string;
  value: string;
}

export const TYPE_FILTER_LABELS: Record<string, string> = {
  income: "Receitas",
  expense: "Despesas",
  transfer: "Transferências",
};

// Transaction status and source types
export type TransactionStatus = 'pending' | 'cleared' | 'reconciled';
export type TransactionSource = 'web' | 'telegram' | 'import';

export interface CreateTransactionInput {
  budgetId: string;
  accountId: string;
  categoryId?: string;
  incomeSourceId?: string;
  memberId?: string;
  toAccountId?: string;
  type: 'income' | 'expense' | 'transfer';
  amount: number;
  description?: string;
  notes?: string;
  date: string | Date;
  isInstallment?: boolean;
  totalInstallments?: number;
}
