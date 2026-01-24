/**
 * Transaction Service
 *
 * Centralized service for transaction-related API calls.
 * Follows Clean Architecture by separating data access from UI.
 */

import type { Transaction } from '@/features/transactions';
import type { CreateTransactionInput } from '@/types';

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
    const response = await fetch(`/api/app/transactions?limit=${limit}`);
    if (!response.ok) throw new Error('Failed to fetch transactions');
    return response.json();
  },

  /**
   * Fetch categories for expense transactions
   */
  async getCategories(): Promise<CategoryResponse> {
    const response = await fetch('/api/app/categories');
    if (!response.ok) throw new Error('Failed to fetch categories');
    return response.json();
  },

  /**
   * Fetch accounts for transactions
   */
  async getAccounts(): Promise<AccountResponse> {
    const response = await fetch('/api/app/accounts');
    if (!response.ok) throw new Error('Failed to fetch accounts');
    return response.json();
  },

  /**
   * Fetch budgets
   */
  async getBudgets(): Promise<BudgetResponse> {
    const response = await fetch('/api/app/budgets');
    if (!response.ok) throw new Error('Failed to fetch budgets');
    return response.json();
  },

  /**
   * Fetch income sources for income transactions
   */
  async getIncomeSources(): Promise<IncomeSourceResponse> {
    const response = await fetch('/api/app/income-sources');
    if (!response.ok) throw new Error('Failed to fetch income sources');
    return response.json();
  },

  /**
   * Create a new transaction
   */
  async createTransaction(data: CreateTransactionInput): Promise<Transaction> {
    const response = await fetch('/api/app/transactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create transaction');
    }
    return response.json();
  },

  /**
   * Update an existing transaction
   */
  async updateTransaction(
    id: string,
    data: Partial<CreateTransactionInput>
  ): Promise<Transaction> {
    const response = await fetch(`/api/app/transactions/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to update transaction');
    }
    return response.json();
  },

  /**
   * Delete a transaction
   */
  async deleteTransaction(id: string): Promise<void> {
    const response = await fetch(`/api/app/transactions/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to delete transaction');
    }
  },
};
