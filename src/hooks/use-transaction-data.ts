'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { format, isSameMonth } from 'date-fns';
import { toast } from 'sonner';
import { transactionService } from '@/services/transaction.service';
import { useExpandedGroups } from '@/components/ui/compact-table';
import { formatCurrencyCompact, parseCurrency, parseLocalDate } from '@/lib/formatters';
import type { TransactionWithRelations } from '@/types';

interface Category {
  id: string;
  name: string;
  icon?: string | null;
}

interface Account {
  id: string;
  name: string;
  type: string;
  icon?: string | null;
}

interface IncomeSource {
  id: string;
  name: string;
  type: string;
  amount: number;
  frequency: string;
}

interface Budget {
  id: string;
  name: string;
}

interface TransactionFormData {
  type: 'income' | 'expense' | 'transfer';
  amount: string;
  description: string;
  accountId: string;
  categoryId: string;
  incomeSourceId: string;
  toAccountId: string;
  date: string;
}

export function useTransactionData() {
  const [transactions, setTransactions] = useState<TransactionWithRelations[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [incomeSources, setIncomeSources] = useState<IncomeSource[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const { isExpanded, toggleGroup, setExpandedGroups } = useExpandedGroups([]);

  // Form states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<TransactionWithRelations | null>(null);
  const [deletingTransaction, setDeletingTransaction] = useState<TransactionWithRelations | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form data
  const [formData, setFormData] = useState<TransactionFormData>({
    type: 'expense',
    amount: '',
    description: '',
    accountId: '',
    categoryId: '',
    incomeSourceId: '',
    toAccountId: '',
    date: format(new Date(), 'yyyy-MM-dd'),
  });

  const fetchData = useCallback(async () => {
    try {
      const [transactionsRes, categoriesRes, accountsRes, budgetsRes, incomeSourcesRes] =
        await Promise.all([
          transactionService.getTransactions(200),
          transactionService.getCategories(),
          transactionService.getAccounts(),
          transactionService.getBudgets(),
          transactionService.getIncomeSources(),
        ]);

      setTransactions(transactionsRes.transactions || []);
      setCategories(categoriesRes.flatCategories || []);
      setAccounts(accountsRes.accounts || []);
      setBudgets(budgetsRes.budgets || []);
      setIncomeSources(incomeSourcesRes.incomeSources || []);

      // Expand current date by default
      const currentDateKey = format(new Date(), 'yyyy-MM-dd');
      setExpandedGroups([currentDateKey]);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setIsLoading(false);
    }
  }, [setExpandedGroups]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Filtered transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      const matchesSearch =
        !searchTerm ||
        t.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.category?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.account?.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = typeFilter === 'all' || t.type === typeFilter;
      return matchesSearch && matchesType;
    });
  }, [transactions, searchTerm, typeFilter]);

  // Group transactions by date
  const groupedTransactions = useMemo(() => {
    const grouped = new Map<string, TransactionWithRelations[]>();
    for (const transaction of filteredTransactions) {
      const dateKey = format(parseLocalDate(transaction.date), 'yyyy-MM-dd');
      const existing = grouped.get(dateKey) || [];
      grouped.set(dateKey, [...existing, transaction]);
    }
    return grouped;
  }, [filteredTransactions]);

  // Sorted date keys (newest first)
  const sortedDates = useMemo(() => {
    return Array.from(groupedTransactions.keys()).sort(
      (a, b) => parseLocalDate(b).getTime() - parseLocalDate(a).getTime()
    );
  }, [groupedTransactions]);

  // Calculate current month totals
  const currentMonthTotals = useMemo(() => {
    const now = new Date();
    const currentMonthTransactions = transactions.filter((t) =>
      isSameMonth(parseLocalDate(t.date), now)
    );

    const income = currentMonthTransactions
      .filter((t) => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);

    const expenses = currentMonthTransactions
      .filter((t) => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);

    return { income, expenses };
  }, [transactions]);

  const openCreateForm = useCallback(() => {
    setFormData({
      type: 'expense',
      amount: '',
      description: '',
      accountId: accounts[0]?.id || '',
      categoryId: '',
      incomeSourceId: '',
      toAccountId: '',
      date: format(new Date(), 'yyyy-MM-dd'),
    });
    setEditingTransaction(null);
    setIsFormOpen(true);
  }, [accounts]);

  const openEditForm = useCallback((transaction: TransactionWithRelations) => {
    setFormData({
      type: transaction.type,
      amount: formatCurrencyCompact(transaction.amount),
      description: transaction.description || '',
      accountId: transaction.accountId,
      categoryId: transaction.categoryId || '',
      incomeSourceId: transaction.incomeSourceId || '',
      toAccountId: transaction.toAccountId || '',
      date: format(parseLocalDate(transaction.date), 'yyyy-MM-dd'),
    });
    setEditingTransaction(transaction);
    setIsFormOpen(true);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!formData.amount || !formData.accountId) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    if (formData.type === 'transfer' && !formData.toAccountId) {
      toast.error('Selecione a conta de destino para transferências');
      return;
    }

    if (budgets.length === 0) {
      toast.error('Nenhum orçamento encontrado');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        budgetId: budgets[0].id,
        type: formData.type,
        amount: parseCurrency(formData.amount),
        description: formData.description || undefined,
        accountId: formData.accountId,
        categoryId:
          formData.type === 'expense' ? formData.categoryId || undefined : undefined,
        incomeSourceId:
          formData.type === 'income' ? formData.incomeSourceId || undefined : undefined,
        toAccountId:
          formData.type === 'transfer' ? formData.toAccountId || undefined : undefined,
        date: new Date(formData.date).toISOString(),
      };

      if (editingTransaction) {
        await transactionService.updateTransaction(editingTransaction.id, payload);
        toast.success('Transação atualizada!');
      } else {
        await transactionService.createTransaction(payload);
        toast.success('Transação criada!');
      }

      setIsFormOpen(false);
      setEditingTransaction(null);
      fetchData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao salvar');
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, budgets, editingTransaction, fetchData]);

  const handleDelete = useCallback(async () => {
    if (!deletingTransaction) return;

    try {
      await transactionService.deleteTransaction(deletingTransaction.id);
      toast.success('Transação excluída!');
      setDeletingTransaction(null);
      fetchData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao excluir');
    }
  }, [deletingTransaction, fetchData]);

  return {
    // Data
    transactions,
    categories,
    accounts,
    incomeSources,
    budgets,
    isLoading,

    // Filters
    searchTerm,
    setSearchTerm,
    typeFilter,
    setTypeFilter,
    filteredTransactions,
    groupedTransactions,
    sortedDates,

    // Grouping
    isExpanded,
    toggleGroup,

    // Totals
    currentMonthTotals,

    // Form state
    isFormOpen,
    setIsFormOpen,
    editingTransaction,
    deletingTransaction,
    setDeletingTransaction,
    isSubmitting,
    formData,
    setFormData,

    // Actions
    openCreateForm,
    openEditForm,
    handleSubmit,
    handleDelete,
    refreshData: fetchData,
  };
}
