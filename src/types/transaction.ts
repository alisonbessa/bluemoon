/**
 * Transaction Domain Types
 */

import type { Account } from './account';
import type { Category } from './category';
import type { IncomeSource } from './income';

export type TransactionType = 'income' | 'expense' | 'transfer';
export type TransactionStatus = 'pending' | 'cleared' | 'reconciled';
export type TransactionSource = 'web' | 'telegram' | 'import';

export interface Transaction {
  id: string;
  budgetId: string;
  accountId: string;
  categoryId?: string | null;
  incomeSourceId?: string | null;
  memberId?: string | null;
  toAccountId?: string | null;
  type: TransactionType;
  amount: number; // In cents
  description?: string | null;
  notes?: string | null;
  date: Date;
  status: TransactionStatus;
  source: TransactionSource;
  isInstallment: boolean;
  installmentNumber?: number | null;
  totalInstallments?: number | null;
  parentTransactionId?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface TransactionWithRelations extends Transaction {
  account?: Account | null;
  category?: Category | null;
  incomeSource?: IncomeSource | null;
}

export interface CreateTransactionInput {
  budgetId: string;
  accountId: string;
  categoryId?: string;
  incomeSourceId?: string;
  memberId?: string;
  toAccountId?: string;
  type: TransactionType;
  amount: number;
  description?: string;
  notes?: string;
  date: string | Date;
  isInstallment?: boolean;
  totalInstallments?: number;
}
