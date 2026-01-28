/**
 * Transaction Service
 *
 * Centralized service for transaction-related API calls.
 * Follows Clean Architecture by separating data access from UI.
 */

import type { Transaction } from "@/features/transactions";
import type { CreateTransactionInput } from "@/types";
import { apiFetch } from "@/shared/lib/api/client";

interface TransactionResponse {
  transactions: Transaction[];
  pagination?: {
    total: number;
    page: number;
    limit: number;
  };
}

interface CategoryResponse {
  flatCategories: { id: string; name: string; icon?: string | null }[];
}

interface AccountResponse {
  accounts: { id: string; name: string; type: string; icon?: string | null }[];
}

interface IncomeSourceResponse {
  incomeSources: {
    id: string;
    name: string;
    type: string;
    amount: number;
    frequency: string;
  }[];
}

interface BudgetResponse {
  budgets: { id: string; name: string }[];
}

export const transactionService = {
  /**
   * Fetch transactions with optional limit
   */
  async getTransactions(limit = 200): Promise<TransactionResponse> {
    return apiFetch<TransactionResponse>(`/api/app/transactions?limit=${limit}`);
  },

  /**
   * Fetch categories for expense transactions
   */
  async getCategories(): Promise<CategoryResponse> {
    return apiFetch<CategoryResponse>("/api/app/categories");
  },

  /**
   * Fetch accounts for transactions
   */
  async getAccounts(): Promise<AccountResponse> {
    return apiFetch<AccountResponse>("/api/app/accounts");
  },

  /**
   * Fetch budgets
   */
  async getBudgets(): Promise<BudgetResponse> {
    return apiFetch<BudgetResponse>("/api/app/budgets");
  },

  /**
   * Fetch income sources for income transactions
   */
  async getIncomeSources(): Promise<IncomeSourceResponse> {
    return apiFetch<IncomeSourceResponse>("/api/app/income-sources");
  },

  /**
   * Create a new transaction
   */
  async createTransaction(data: CreateTransactionInput): Promise<Transaction> {
    return apiFetch<Transaction>("/api/app/transactions", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  /**
   * Update an existing transaction
   */
  async updateTransaction(
    id: string,
    data: Partial<CreateTransactionInput>
  ): Promise<Transaction> {
    return apiFetch<Transaction>(`/api/app/transactions/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  },

  /**
   * Delete a transaction
   */
  async deleteTransaction(id: string): Promise<void> {
    await apiFetch<void>(`/api/app/transactions/${id}`, {
      method: "DELETE",
    });
  },
};
