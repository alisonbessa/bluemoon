// =============================================================================
// Tipos de Domínio - Transactions Module
// Tipos de domínio completos são importados de @/types
// Aqui definimos apenas tipos específicos de UI/componentes
// =============================================================================

import type { AccountType } from "@/types/account";

/**
 * Tipos simplificados para uso em UI (selects, listas, etc.)
 * Usamos interfaces mínimas para evitar dependência de campos não necessários.
 */

export interface Category {
  id: string;
  name: string;
  icon?: string | null;
}

export interface Account {
  id: string;
  name: string;
  type: AccountType | string; // Aceita tanto o tipo preciso quanto string para compatibilidade
  icon?: string | null;
}

export interface IncomeSource {
  id: string;
  name: string;
  type: string;
  amount: number;
  frequency: string;
}

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
