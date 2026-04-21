"use client";

import { useState, useMemo, useCallback } from "react";
import { useSetupMode } from "@/shared/hooks/use-setup-mode";
import { SetupTip } from "@/shared/components/setup-tip";
import { Loader2, Plus } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { parseLocalDate } from "@/shared/lib/formatters";
import { PageHeader, PageContent, ResponsiveButton } from "@/shared/molecules";
import { useTutorial } from "@/shared/tutorial/tutorial-provider";
import { useMembers, useUser } from "@/shared/hooks";
import { useViewMode } from "@/shared/providers/view-mode-provider";
import dynamic from "next/dynamic";
import {
  TransactionSummary,
  TransactionFiltersBar,
  TransactionFiltersMobile,
  TransactionDeleteDialog,
  TransactionWidget,
  TransactionFiltersSheet,
  useTransactionData,
  useTransactionFilters,
  useTransactionForm,
  type Transaction,
  type TransactionsResponse,
} from "@/features/transactions";

const TransactionFormModal = dynamic(
  () => import("@/features/transactions/ui/transaction-form-modal").then((mod) => ({ default: mod.TransactionFormModal })),
  { ssr: false }
);
import { TransactionBulkActionsBar } from "./transaction-bulk-actions-bar";
import { useTransactionCacheInvalidation } from "@/features/transactions/hooks/use-transaction-cache-invalidation";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/ui/alert-dialog";

export interface TransactionsClientProps {
  initialYear: number;
  initialMonth: number;
  initialData: TransactionsResponse | null;
}

export function TransactionsClient({
  initialYear,
  initialMonth,
  initialData,
}: TransactionsClientProps) {
  // ============== TUTORIAL ==============
  const { notifyActionCompleted, isActive: isTutorialActive } = useTutorial();
  const { isSetupMode, dismissSetup } = useSetupMode();

  // ============== CURRENT USER MEMBER ==============
  const { user } = useUser();
  const { members } = useMembers();
  const { isDuoPlan } = useViewMode();
  const currentMemberId = members.find((m) => m.userId === user?.id)?.id;

  // Members with userId (owner + partner) for "Quem pagou?" selector
  const payerMembers = members
    .filter((m) => m.userId)
    .map((m) => ({ id: m.id, name: m.name }));

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
  } = useTransactionData({
    fallbackData: initialData,
    initialYear,
    initialMonth,
  });

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
    applyToSeries,
    setApplyToSeries,
    openCreate,
    openEdit,
    handleSubmit,
  } = useTransactionForm({
    accounts,
    budgets,
    memberId: currentMemberId,
    defaultPaidByMemberId: currentMemberId,
    onSuccess: async (submittedDate?: Date) => {
      // If the submitted transaction lands on a different month than the one being
      // viewed, jump the period selector so the user sees what they just created.
      // submittedDate is already a local-TZ date (parsed via parseLocalDate upstream).
      if (submittedDate) {
        const submittedYear = submittedDate.getFullYear();
        const submittedMonth = submittedDate.getMonth() + 1;
        if (submittedYear !== periodValue.year || submittedMonth !== periodValue.month) {
          handlePeriodChange({
            year: submittedYear,
            month: submittedMonth,
            week: periodValue.week,
          });
        }
      }
      fetchData();
      triggerWidgetRefresh();
      // Invalidate related caches so other components update
      const { mutate: globalMutate } = await import("swr");
      globalMutate((key: unknown) => typeof key === "string" && (
        key.startsWith("/api/app/dashboard") ||
        key.startsWith("/api/app/accounts") ||
        key.startsWith("/api/app/allocations")
      ));
      // Notify tutorial that user created a transaction
      if (isTutorialActive) {
        notifyActionCompleted("hasTransactions");
      }
    },
  });

  // ============== DELETE STATE ==============
  const [deletingTransaction, setDeletingTransaction] = useState<Transaction | null>(null);

  // ============== DERIVED VALUES ==============
  const confirmedTransactions = useMemo(
    () => transactions.filter((t) => t.status !== "pending"),
    [transactions]
  );

  const isPastMonth = periodValue.year < new Date().getFullYear() ||
    (periodValue.year === new Date().getFullYear() && periodValue.month < new Date().getMonth() + 1);

  const { confirmedIncome, confirmedExpenses, totalIncome, totalExpenses } = useMemo(() => {
    const isGoalContribution = (t: Transaction) =>
      t.type === "transfer" && t.description?.startsWith("Contribuição para meta");
    const confirmed = transactions.filter((t) => t.status !== "pending");
    return {
      confirmedIncome: confirmed
        .filter((t) => t.type === "income")
        .reduce((sum, t) => sum + t.amount, 0),
      confirmedExpenses: confirmed
        .filter((t) => t.type === "expense" || isGoalContribution(t))
        .reduce((sum, t) => sum + Math.abs(t.amount), 0),
      totalIncome: transactions
        .filter((t) => t.type === "income")
        .reduce((sum, t) => sum + t.amount, 0),
      totalExpenses: transactions
        .filter((t) => t.type === "expense" || isGoalContribution(t))
        .reduce((sum, t) => sum + Math.abs(t.amount), 0),
    };
  }, [transactions]);

  // ============== SELECTION STATE ==============
  // Two separate maps - only one section can have selections at a time.
  // Pending items are scheduled (synthetic IDs), so we store the full object.
  type PendingItem = {
    id: string;
    type: "income" | "expense";
    amount: number;
    name: string;
    categoryId?: string;
    incomeSourceId?: string;
    recurringBillId?: string;
    goalId?: string;
    sourceType: string;
    dueDate: string;
  };
  const [selectedPending, setSelectedPending] = useState<Map<string, PendingItem>>(new Map());
  const [selectedConfirmedIds, setSelectedConfirmedIds] = useState<Set<string>>(new Set());
  const [bulkPending, setBulkPending] = useState(false);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const invalidateCaches = useTransactionCacheInvalidation();

  const activeSelection: "pending" | "confirmed" | null =
    selectedPending.size > 0
      ? "pending"
      : selectedConfirmedIds.size > 0
        ? "confirmed"
        : null;
  const selectionCount = selectedPending.size + selectedConfirmedIds.size;

  const togglePendingSelect = useCallback((item: PendingItem) => {
    setSelectedPending((prev) => {
      const next = new Map(prev);
      if (next.has(item.id)) {
        next.delete(item.id);
      } else {
        next.set(item.id, item);
        // Selecting pending clears confirmed
        setSelectedConfirmedIds(new Set());
      }
      return next;
    });
  }, []);

  const toggleConfirmedSelect = useCallback((id: string) => {
    setSelectedConfirmedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
        // Selecting confirmed clears pending
        setSelectedPending(new Map());
      }
      return next;
    });
  }, []);

  const selectAllPending = useCallback((items: PendingItem[]) => {
    setSelectedPending(new Map(items.map((i) => [i.id, i])));
    setSelectedConfirmedIds(new Set());
  }, []);

  const selectAllConfirmed = useCallback((ids: string[]) => {
    setSelectedConfirmedIds(new Set(ids));
    setSelectedPending(new Map());
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedPending(new Map());
    setSelectedConfirmedIds(new Set());
  }, []);

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
      invalidateCaches();
      triggerWidgetRefresh();
      fetchData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao excluir");
    }
  }, [deletingTransaction, fetchData, triggerWidgetRefresh, invalidateCaches]);

  const handleStartMonth = useCallback(async () => {
    if (budgets.length === 0) {
      toast.error("Nenhum orçamento encontrado");
      return;
    }

    try {
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
        toast.error(data.error || "Erro ao iniciar o mês");
        return;
      }

      if (data.createdTransactions > 0) {
        toast.success(`Mês iniciado! ${data.createdTransactions} transações criadas.`);
      } else {
        toast.success("Mês iniciado!");
      }
      triggerWidgetRefresh();
      fetchData();
    } catch (error) {
      toast.error("Erro ao iniciar o mês. Tente novamente.");
    }
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

  const handleDeletePending = useCallback(
    async (scheduled: { id: string; name: string }) => {
      try {
        const res = await fetch(`/api/app/transactions/${scheduled.id}`, {
          method: "DELETE",
        });
        if (!res.ok) throw new Error();
        toast.success(`"${scheduled.name}" excluída`);
        invalidateCaches();
        triggerWidgetRefresh();
        fetchData();
      } catch {
        toast.error("Erro ao excluir transação pendente");
      }
    },
    [triggerWidgetRefresh, fetchData, invalidateCaches]
  );

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
        toast.error("Nenhuma forma de pagamento encontrada");
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

        invalidateCaches();
        triggerWidgetRefresh();
        fetchData();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Erro ao confirmar");
      }
    },
    [accounts, budgets, periodValue, fetchData, triggerWidgetRefresh, invalidateCaches]
  );

  // ============== BULK & REVERT HANDLERS ==============
  const handleRevertConfirmed = useCallback(
    async (transaction: { id: string }) => {
      try {
        const res = await fetch(`/api/app/transactions/${transaction.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "pending" }),
        });
        if (!res.ok) throw new Error();
        toast.success("Voltou para pendente");
        invalidateCaches();
        triggerWidgetRefresh();
        fetchData();
      } catch {
        toast.error("Erro ao reverter transação");
      }
    },
    [fetchData, triggerWidgetRefresh, invalidateCaches]
  );

  // Bulk action for CONFIRMED section (uses bulk API, passes real transaction IDs)
  const runConfirmedBulkAction = useCallback(
    async (action: "updateStatus" | "delete", status?: "pending" | "cleared") => {
      const ids = Array.from(selectedConfirmedIds);
      if (ids.length === 0) return;
      setBulkPending(true);
      try {
        const res = await fetch("/api/app/transactions/bulk", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action,
            transactionIds: ids,
            ...(status && { status }),
          }),
        });
        if (!res.ok) throw new Error();
        const data = await res.json();
        const successCount = data.success ?? 0;
        if (action === "updateStatus" && status === "pending") {
          toast.success(`${successCount} transações voltaram para pendente`);
        } else if (action === "delete") {
          toast.success(`${successCount} transações excluídas`);
        }
        clearSelection();
        setBulkDeleteOpen(false);
        invalidateCaches();
        triggerWidgetRefresh();
        fetchData();
      } catch {
        toast.error("Erro ao processar ação em massa");
      } finally {
        setBulkPending(false);
      }
    },
    [selectedConfirmedIds, clearSelection, invalidateCaches, triggerWidgetRefresh, fetchData]
  );

  // Bulk action for PENDING section (loops because items are scheduled/synthetic)
  const runPendingBulkAction = useCallback(
    async (action: "confirm" | "delete") => {
      const items = Array.from(selectedPending.values());
      if (items.length === 0) return;
      setBulkPending(true);
      let successCount = 0;
      let failedCount = 0;
      try {
        for (const item of items) {
          try {
            if (action === "confirm") {
              if (accounts.length === 0) {
                failedCount++;
                continue;
              }
              const res = await fetch("/api/app/transactions/confirm-scheduled", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  budgetId: budgets[0]?.id,
                  type: item.type,
                  amount: item.amount,
                  description: item.name,
                  accountId: accounts[0].id,
                  categoryId: item.categoryId || undefined,
                  incomeSourceId: item.incomeSourceId || undefined,
                  recurringBillId: item.recurringBillId || undefined,
                  date: new Date(item.dueDate).toISOString(),
                }),
              });
              if (res.ok) successCount++;
              else failedCount++;
            } else if (action === "delete") {
              // Only works for real DB transactions (pending rows with UUID id)
              const res = await fetch(`/api/app/transactions/${item.id}`, {
                method: "DELETE",
              });
              if (res.ok) successCount++;
              else failedCount++;
            }
          } catch {
            failedCount++;
          }
        }
        if (action === "confirm") {
          toast.success(`${successCount} transações confirmadas`);
        } else {
          toast.success(`${successCount} transações excluídas`);
        }
        if (failedCount > 0) {
          toast.error(`${failedCount} falharam`);
        }
        clearSelection();
        setBulkDeleteOpen(false);
        invalidateCaches();
        triggerWidgetRefresh();
        fetchData();
      } finally {
        setBulkPending(false);
      }
    },
    [selectedPending, accounts, budgets, clearSelection, invalidateCaches, triggerWidgetRefresh, fetchData]
  );

  const handleBulkConfirm = useCallback(() => {
    // Only applies to pending section
    if (activeSelection === "pending") {
      return runPendingBulkAction("confirm");
    }
  }, [activeSelection, runPendingBulkAction]);

  const handleBulkRevert = useCallback(() => {
    // Only applies to confirmed section
    if (activeSelection === "confirmed") {
      return runConfirmedBulkAction("updateStatus", "pending");
    }
  }, [activeSelection, runConfirmedBulkAction]);

  const handleBulkDelete = useCallback(() => {
    if (activeSelection === "pending") {
      return runPendingBulkAction("delete");
    }
    if (activeSelection === "confirmed") {
      return runConfirmedBulkAction("delete");
    }
  }, [activeSelection, runPendingBulkAction, runConfirmedBulkAction]);

  const handleEditScheduled = useCallback(
    (scheduled: {
      type: "income" | "expense";
      amount: number;
      name: string;
      categoryId?: string;
      incomeSourceId?: string;
      accountId?: string;
      dueDate: string;
    }) => {
      setFormData({
        type: scheduled.type,
        amount: (scheduled.amount / 100).toFixed(2).replace(".", ","),
        description: scheduled.name,
        accountId: scheduled.accountId || accounts[0]?.id || "",
        categoryId: scheduled.categoryId || "",
        incomeSourceId: scheduled.incomeSourceId || "",
        toAccountId: "",
        date: format(parseLocalDate(scheduled.dueDate), "yyyy-MM-dd"),
        isInstallment: false,
        totalInstallments: 2,
        isRecurring: false,
        recurringFrequency: "monthly",
        recurringIsAutoDebit: false,
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
    <PageContent>
      {isSetupMode && (
        <SetupTip
          title="Registre seu primeiro gasto"
          description="Clique em '+ Nova Transação' para registrar uma despesa, receita ou transferência. Você também pode registrar gastos pelo WhatsApp ou Telegram."
          onDismiss={dismissSetup}
        />
      )}

      {/* Header */}
      <PageHeader
        title="Transações"
        description="Gerencie todas as suas movimentações financeiras"
        actions={
          <ResponsiveButton
            icon={<Plus className="h-4 w-4" />}
            size="sm"
            onClick={openCreate}
            data-tutorial="add-transaction-button"
          >
            Nova Transação
          </ResponsiveButton>
        }
      />

      {/* Summary Cards */}
      <TransactionSummary income={confirmedIncome} expenses={confirmedExpenses} totalIncome={totalIncome} totalExpenses={totalExpenses} />

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

      {/* Bulk Actions Bar */}
      <TransactionBulkActionsBar
        count={selectionCount}
        activeSection={activeSelection}
        onConfirm={handleBulkConfirm}
        onRevertToPending={handleBulkRevert}
        onDelete={() => setBulkDeleteOpen(true)}
        onClear={clearSelection}
        isPending={bulkPending}
      />

      {/* Transaction Widget */}
      {budgets.length > 0 && (
        <TransactionWidget
          budgetId={budgets[0].id}
          refreshKey={widgetRefreshKey}
          confirmedTransactions={confirmedTransactions}
          currentMemberId={currentMemberId}
          members={members}
          searchTerm={searchTerm}
          typeFilter={typeFilter}
          categoryFilter={categoryFilter}
          accountFilter={accountFilter}
          periodValue={periodValue}
          onPeriodChange={handlePeriodChange}
          onStartMonth={isPastMonth ? undefined : handleStartMonth}
          onCopyPreviousMonth={isPastMonth ? undefined : handleCopyPreviousMonth}
          onEdit={handleEditScheduled}
          onConfirm={handleConfirmScheduled}
          onEditConfirmed={(transaction) => openEdit(transaction as Transaction)}
          onDeleteConfirmed={(transaction) => setDeletingTransaction(transaction as Transaction)}
          onDeletePending={handleDeletePending}
          onRevertConfirmed={handleRevertConfirmed}
          selectedPending={selectedPending}
          selectedConfirmedIds={selectedConfirmedIds}
          onTogglePendingSelect={togglePendingSelect}
          onToggleConfirmedSelect={toggleConfirmedSelect}
          onSelectAllPending={selectAllPending}
          onSelectAllConfirmed={selectAllConfirmed}
        />
      )}

      {/* Bulk Delete Confirmation */}
      <AlertDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir {selectionCount} transações?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Os saldos das contas serão revertidos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={bulkPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              disabled={bulkPending}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>


      {/* Transaction Form Modal */}
      <TransactionFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        isEditing={!!editingTransaction}
        editingTransaction={editingTransaction}
        formData={formData}
        setFormData={setFormData}
        categories={categories}
        accounts={accounts}
        incomeSources={incomeSources}
        isSubmitting={isSubmitting}
        onSubmit={handleSubmit}
        applyToSeries={applyToSeries}
        onApplyToSeriesChange={setApplyToSeries}
        isDuoPlan={isDuoPlan}
        members={payerMembers}
      />

      {/* Delete Confirmation Dialog */}
      <TransactionDeleteDialog
        transaction={deletingTransaction}
        onClose={() => setDeletingTransaction(null)}
        onConfirm={handleDelete}
      />
    </PageContent>
  );
}
