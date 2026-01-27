"use client";

import { useState, useMemo, useCallback } from "react";
import { Loader2, Plus } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { parseLocalDate } from "@/shared/lib/formatters";
import { PageHeader, ResponsiveButton } from "@/shared/molecules";
import {
  TransactionSummary,
  TransactionFiltersBar,
  TransactionFiltersMobile,
  TransactionFormModal,
  TransactionDeleteDialog,
  TransactionWidget,
  TransactionFiltersSheet,
  useTransactionData,
  useTransactionFilters,
  useTransactionForm,
  type Transaction,
} from "@/features/transactions";

export default function TransactionsPage() {
  // ============== DATA HOOK ==============
  const {
    transactions,
    categories,
    accounts,
    incomeSources,
    budgets,
    isLoading,
    periodValue,
    handlePeriodChange,
    fetchData,
    widgetRefreshKey,
    triggerWidgetRefresh,
  } = useTransactionData();

  // ============== FILTERS HOOK ==============
  const {
    searchTerm,
    setSearchTerm,
    typeFilter,
    setTypeFilter,
    categoryFilter,
    setCategoryFilter,
    accountFilter,
    setAccountFilter,
    isFilterSheetOpen,
    setIsFilterSheetOpen,
    filterChips,
    clearAllFilters,
    handleRemoveFilter,
  } = useTransactionFilters({ categories, accounts });

  // ============== FORM HOOK ==============
  const {
    isOpen: isFormOpen,
    setIsOpen: setIsFormOpen,
    editingTransaction,
    formData,
    setFormData,
    isSubmitting,
    openCreate,
    openEdit,
    handleSubmit,
  } = useTransactionForm({
    accounts,
    budgets,
    onSuccess: () => {
      fetchData();
      triggerWidgetRefresh();
    },
  });

  // ============== DELETE STATE ==============
  const [deletingTransaction, setDeletingTransaction] = useState<Transaction | null>(null);

  // ============== DERIVED VALUES ==============
  const confirmedTransactions = useMemo(
    () => transactions.filter((t) => t.status !== "pending"),
    [transactions]
  );

  const { confirmedIncome, confirmedExpenses } = useMemo(() => {
    return {
      confirmedIncome: confirmedTransactions
        .filter((t) => t.type === "income")
        .reduce((sum, t) => sum + t.amount, 0),
      confirmedExpenses: confirmedTransactions
        .filter((t) => t.type === "expense")
        .reduce((sum, t) => sum + t.amount, 0),
    };
  }, [confirmedTransactions]);

  // ============== HANDLERS ==============
  const handleDelete = useCallback(async () => {
    if (!deletingTransaction) return;

    const isFromPlanning =
      deletingTransaction.recurringBillId || deletingTransaction.incomeSourceId;

    try {
      const response = await fetch(
        `/api/app/transactions/${deletingTransaction.id}`,
        { method: "DELETE" }
      );

      if (!response.ok) {
        throw new Error(
          isFromPlanning ? "Erro ao desfazer confirmação" : "Erro ao excluir transação"
        );
      }

      toast.success(isFromPlanning ? "Confirmação desfeita!" : "Transação excluída!");
      setDeletingTransaction(null);
      triggerWidgetRefresh();
      fetchData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao excluir");
    }
  }, [deletingTransaction, fetchData, triggerWidgetRefresh]);

  const handleStartMonth = useCallback(async () => {
    if (budgets.length === 0) {
      toast.error("Nenhum orçamento encontrado");
      return;
    }

    const response = await fetch("/api/app/budget/start-month", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        budgetId: budgets[0].id,
        year: periodValue.year,
        month: periodValue.month,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Erro ao iniciar o mês");
    }

    toast.success(`Mês iniciado! ${data.createdTransactions} transações criadas.`);
    triggerWidgetRefresh();
    fetchData();
  }, [budgets, periodValue, fetchData, triggerWidgetRefresh]);

  const handleCopyPreviousMonth = useCallback(async () => {
    if (budgets.length === 0) {
      toast.error("Nenhum orçamento encontrado");
      return;
    }

    let fromYear = periodValue.year;
    let fromMonth = periodValue.month - 1;
    if (fromMonth === 0) {
      fromMonth = 12;
      fromYear -= 1;
    }

    const response = await fetch("/api/app/allocations/copy", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        budgetId: budgets[0].id,
        fromYear,
        fromMonth,
        toYear: periodValue.year,
        toMonth: periodValue.month,
        mode: "all",
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      if (data.error?.includes("No allocations") || data.error?.includes("No categories")) {
        toast.error("Nenhum planejamento encontrado para copiar", {
          description: "Configure o orçamento na página de planejamento",
          action: {
            label: "Ir para Planejamento",
            onClick: () => {
              window.location.href = `/app/budget?year=${periodValue.year}&month=${periodValue.month}`;
            },
          },
        });
      } else {
        toast.error(data.error || "Erro ao copiar planejamento");
      }
      return;
    }

    toast.success(`Planejamento copiado! ${data.copiedCount} alocações criadas.`);
    triggerWidgetRefresh();
  }, [budgets, periodValue, triggerWidgetRefresh]);

  const handleConfirmScheduled = useCallback(
    async (scheduled: {
      type: "income" | "expense";
      amount: number;
      name: string;
      categoryId?: string;
      incomeSourceId?: string;
      recurringBillId?: string;
      goalId?: string;
      sourceType: string;
      dueDate: string;
    }) => {
      if (accounts.length === 0) {
        toast.error("Nenhuma conta encontrada");
        return;
      }

      try {
        if (scheduled.sourceType === "goal" && scheduled.goalId) {
          const response = await fetch(
            `/api/app/goals/${scheduled.goalId}/contribute`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                fromAccountId: accounts[0].id,
                amount: scheduled.amount,
                year: periodValue.year,
                month: periodValue.month,
              }),
            }
          );

          if (!response.ok) {
            throw new Error("Erro ao contribuir para meta");
          }

          toast.success("Contribuição para meta confirmada!");
        } else {
          // First, check if there's an existing pending transaction for this item
          // This prevents creating duplicates when a pending transaction already exists
          const confirmPayload = {
            budgetId: budgets[0].id,
            type: scheduled.type,
            amount: scheduled.amount,
            description: scheduled.name,
            accountId: accounts[0].id,
            categoryId: scheduled.categoryId || undefined,
            incomeSourceId: scheduled.incomeSourceId || undefined,
            recurringBillId: scheduled.recurringBillId || undefined,
            date: new Date(scheduled.dueDate).toISOString(),
          };

          // Use the confirm-scheduled endpoint that handles duplicates
          const response = await fetch("/api/app/transactions/confirm-scheduled", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(confirmPayload),
          });

          if (!response.ok) {
            throw new Error("Erro ao confirmar transação");
          }

          toast.success("Transação confirmada!");
        }

        triggerWidgetRefresh();
        fetchData();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Erro ao confirmar");
      }
    },
    [accounts, budgets, periodValue, fetchData, triggerWidgetRefresh]
  );

  const handleEditScheduled = useCallback(
    (scheduled: {
      type: "income" | "expense";
      amount: number;
      name: string;
      categoryId?: string;
      incomeSourceId?: string;
      dueDate: string;
    }) => {
      setFormData({
        type: scheduled.type,
        amount: (scheduled.amount / 100).toFixed(2).replace(".", ","),
        description: scheduled.name,
        accountId: accounts[0]?.id || "",
        categoryId: scheduled.categoryId || "",
        incomeSourceId: scheduled.incomeSourceId || "",
        toAccountId: "",
        date: format(parseLocalDate(scheduled.dueDate), "yyyy-MM-dd"),
        isInstallment: false,
        totalInstallments: 2,
      });
      setIsFormOpen(true);
    },
    [accounts, setFormData, setIsFormOpen]
  );

  // ============== LOADING STATE ==============
  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // ============== RENDER ==============
  return (
    <div className="flex flex-col gap-4 sm:gap-6 p-4 sm:p-6">
      {/* Header */}
      <PageHeader
        title="Transações"
        description="Gerencie todas as suas movimentações financeiras"
        actions={
          <ResponsiveButton icon={<Plus className="h-4 w-4" />} size="sm" onClick={openCreate}>
            Nova Transação
          </ResponsiveButton>
        }
      />

      {/* Summary Cards */}
      <TransactionSummary income={confirmedIncome} expenses={confirmedExpenses} />

      {/* Filters - Desktop */}
      <TransactionFiltersBar
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        typeFilter={typeFilter}
        onTypeFilterChange={setTypeFilter}
        categoryFilter={categoryFilter}
        onCategoryFilterChange={setCategoryFilter}
        accountFilter={accountFilter}
        onAccountFilterChange={setAccountFilter}
        categories={categories}
        accounts={accounts}
        filterChips={filterChips}
        onRemoveFilter={handleRemoveFilter}
        onClearAll={clearAllFilters}
      />

      {/* Filters - Mobile */}
      <TransactionFiltersMobile
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        onOpenFilters={() => setIsFilterSheetOpen(true)}
        filterChips={filterChips}
        onRemoveFilter={handleRemoveFilter}
        onClearAll={clearAllFilters}
      />

      {/* Filter Sheet for Mobile */}
      <TransactionFiltersSheet
        open={isFilterSheetOpen}
        onOpenChange={setIsFilterSheetOpen}
        typeFilter={typeFilter}
        onTypeFilterChange={setTypeFilter}
        categoryFilter={categoryFilter}
        onCategoryFilterChange={setCategoryFilter}
        accountFilter={accountFilter}
        onAccountFilterChange={setAccountFilter}
        categories={categories}
        accounts={accounts}
        resultCount={confirmedTransactions.length}
        onClear={clearAllFilters}
      />

      {/* Transaction Widget */}
      {budgets.length > 0 && (
        <TransactionWidget
          budgetId={budgets[0].id}
          refreshKey={widgetRefreshKey}
          confirmedTransactions={confirmedTransactions}
          searchTerm={searchTerm}
          typeFilter={typeFilter}
          categoryFilter={categoryFilter}
          accountFilter={accountFilter}
          periodValue={periodValue}
          onPeriodChange={handlePeriodChange}
          onStartMonth={handleStartMonth}
          onCopyPreviousMonth={handleCopyPreviousMonth}
          onEdit={handleEditScheduled}
          onConfirm={handleConfirmScheduled}
          onEditConfirmed={(transaction) => openEdit(transaction as Transaction)}
          onDeleteConfirmed={(transaction) => setDeletingTransaction(transaction as Transaction)}
        />
      )}

      {/* Transaction Form Modal */}
      <TransactionFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        isEditing={!!editingTransaction}
        formData={formData}
        setFormData={setFormData}
        categories={categories}
        accounts={accounts}
        incomeSources={incomeSources}
        isSubmitting={isSubmitting}
        onSubmit={handleSubmit}
      />

      {/* Delete Confirmation Dialog */}
      <TransactionDeleteDialog
        transaction={deletingTransaction}
        onClose={() => setDeletingTransaction(null)}
        onConfirm={handleDelete}
      />
    </div>
  );
}
