"use client";

import { useEffect, useCallback } from "react";
import useSWR from "swr";
import { Plus } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { useSidebar } from "@/shared/ui/sidebar";
import { useViewMode } from "@/shared/providers/view-mode-provider";
import { useTransactionForm } from "@/features/transactions/hooks/use-transaction-form";
import { TransactionFormModal } from "@/features/transactions/ui/transaction-form-modal";
import { useMembers, useUser } from "@/shared/hooks";
import { cn } from "@/shared/lib/utils";
import type { Category, Account, IncomeSource, Budget } from "@/features/transactions/types";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/shared/ui/tooltip";

interface CategoriesResponse {
  flatCategories: Category[];
}

interface AccountsResponse {
  accounts: Account[];
}

interface BudgetsResponse {
  budgets: Budget[];
}

interface IncomeSourcesResponse {
  incomeSources: IncomeSource[];
}

export function QuickAddTransaction() {
  const { state, isMobile, setOpenMobile } = useSidebar();
  const isCollapsed = state === "collapsed";
  const { viewMode, isDuoPlan } = useViewMode();
  const vm = isDuoPlan ? `?viewMode=${viewMode}` : "";
  const { user } = useUser();
  const { members } = useMembers();
  const currentMemberId = members.find((m) => m.userId === user?.id)?.id;

  // Members with userId (owner + partner) for "Quem pagou?" selector
  const payerMembers = members
    .filter((m) => m.userId)
    .map((m) => ({ id: m.id, name: m.name }));

  // Fetch data on demand (SWR caches and deduplicates)
  const { data: categoriesData } = useSWR<CategoriesResponse>(
    "/api/app/categories"
  );
  const { data: accountsData } = useSWR<AccountsResponse>(
    `/api/app/accounts${vm}`
  );
  const { data: budgetsData } = useSWR<BudgetsResponse>("/api/app/budgets");
  const { data: incomeData } = useSWR<IncomeSourcesResponse>(
    `/api/app/income-sources${vm}`
  );

  const categories = categoriesData?.flatCategories ?? [];
  const accounts = accountsData?.accounts ?? [];
  const budgets = budgetsData?.budgets ?? [];
  const incomeSources = incomeData?.incomeSources ?? [];

  const {
    isOpen,
    setIsOpen,
    editingTransaction,
    formData,
    setFormData,
    isSubmitting,
    applyToSeries,
    setApplyToSeries,
    openCreate,
    handleSubmit,
  } = useTransactionForm({
    accounts,
    budgets,
    memberId: currentMemberId,
    defaultPaidByMemberId: currentMemberId,
    onSuccess: () => {
      // Close mobile sidebar after creating transaction
      if (isMobile) {
        setOpenMobile(false);
      }
    },
  });

  const handleClick = useCallback(() => {
    openCreate();
  }, [openCreate]);

  // Keyboard shortcut: Ctrl/Cmd+N
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "n") {
        e.preventDefault();
        openCreate();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [openCreate]);

  // Don't render if no budgets loaded yet
  if (budgets.length === 0 && !budgetsData) return null;

  return (
    <>
      {/* Trigger button */}
      <div className={cn("py-1", isCollapsed ? "flex justify-center" : "px-2")}>
        {isCollapsed ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={handleClick}
                className="flex items-center justify-center size-8 rounded-full bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors"
              >
                <Plus className="size-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">Nova Transação</TooltipContent>
          </Tooltip>
        ) : (
          <Button
            onClick={handleClick}
            className="w-full bg-primary text-primary-foreground shadow-sm"
          >
            <Plus className="size-4 mr-2" />
            Nova Transação
          </Button>
        )}
      </div>

      {/* Modal */}
      <TransactionFormModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        isEditing={false}
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
    </>
  );
}
