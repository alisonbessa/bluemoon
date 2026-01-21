/**
 * Transaction Domain Types
 *
 * @deprecated Import from '@/features/transactions' instead
 * This file re-exports from the new FSD location for backwards compatibility
 */

export {
  type Transaction,
  type TransactionType,
  type TransactionFormData,
  type TypeFilter,
  type FilterChip,
  TYPE_FILTER_LABELS,
} from '@/features/transactions';

// Legacy type aliases for API compatibility
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
