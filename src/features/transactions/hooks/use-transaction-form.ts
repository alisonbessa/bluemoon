"use client";

import { useState, useCallback } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { formatCurrencyCompact, parseCurrency, parseLocalDate } from "@/shared/lib/formatters";
import type { Transaction, Account, Budget, TransactionFormData } from "../types";
import { initialFormData } from "../types";

interface UseTransactionFormOptions {
  accounts: Account[];
  budgets: Budget[];
  onSuccess: () => void;
  memberId?: string;
  defaultPaidByMemberId?: string;
}

interface UseTransactionFormReturn {
  // State
  isOpen: boolean;
  setIsOpen: (value: boolean) => void;
  editingTransaction: Transaction | null;
  formData: TransactionFormData;
  setFormData: React.Dispatch<React.SetStateAction<TransactionFormData>>;
  isSubmitting: boolean;
  applyToSeries: boolean;
  setApplyToSeries: (value: boolean) => void;
  // Actions
  openCreate: () => void;
  openEdit: (transaction: Transaction) => void;
  handleSubmit: () => Promise<void>;
  resetForm: () => void;
}

export function useTransactionForm(
  options: UseTransactionFormOptions
): UseTransactionFormReturn {
  const { accounts, budgets, onSuccess, memberId, defaultPaidByMemberId } = options;

  const [isOpen, setIsOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<TransactionFormData>(initialFormData);
  const [applyToSeries, setApplyToSeries] = useState(false);

  const resetForm = useCallback(() => {
    setFormData({
      ...initialFormData,
      accountId: accounts[0]?.id || "",
      date: format(new Date(), "yyyy-MM-dd"),
    });
    setEditingTransaction(null);
    setApplyToSeries(false);
  }, [accounts]);

  const openCreate = useCallback(() => {
    setFormData({
      ...initialFormData,
      accountId: accounts[0]?.id || "",
      date: format(new Date(), "yyyy-MM-dd"),
      paidByMemberId: defaultPaidByMemberId,
    });
    setEditingTransaction(null);
    setIsOpen(true);
  }, [accounts, defaultPaidByMemberId]);

  const openEdit = useCallback((transaction: Transaction) => {
    setFormData({
      type: transaction.type,
      amount: formatCurrencyCompact(transaction.amount),
      description: transaction.description || "",
      accountId: transaction.accountId,
      categoryId: transaction.categoryId || "",
      incomeSourceId: transaction.incomeSourceId || "",
      toAccountId: transaction.toAccountId || "",
      date: format(parseLocalDate(transaction.date), "yyyy-MM-dd"),
      isInstallment: false,
      totalInstallments: 2,
      paidByMemberId: transaction.paidByMemberId || defaultPaidByMemberId,
      isRecurring: false, // Editing doesn't allow changing to recurring
      recurringFrequency: "monthly",
      recurringIsAutoDebit: false,
    });
    setEditingTransaction(transaction);
    setIsOpen(true);
  }, [defaultPaidByMemberId]);

  const handleSubmit = useCallback(async () => {
    if (!formData.amount || !formData.accountId) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    if (formData.type === "transfer" && !formData.toAccountId) {
      toast.error("Selecione a conta de destino para transferências");
      return;
    }

    if (budgets.length === 0) {
      toast.error("Nenhum orçamento encontrado");
      return;
    }

    setIsSubmitting(true);
    try {
      const amountInCents = parseCurrency(formData.amount);

      // Recurring bill flow: create a recurring bill instead of a transaction
      if (formData.isRecurring && formData.type === "expense" && !editingTransaction) {
        if (!formData.categoryId) {
          toast.error("Selecione uma categoria para despesas fixas");
          setIsSubmitting(false);
          return;
        }

        const recurringPayload = {
          budgetId: budgets[0].id,
          categoryId: formData.categoryId,
          accountId: formData.accountId,
          name: formData.description || "Despesa fixa",
          amount: amountInCents,
          frequency: formData.recurringFrequency,
          dueDay: formData.recurringDueDay ?? null,
          dueMonth: formData.recurringFrequency === "yearly" ? formData.recurringDueMonth ?? null : null,
          isAutoDebit: formData.recurringIsAutoDebit,
          isVariable: false,
        };

        const response = await fetch("/api/app/recurring-bills", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(recurringPayload),
        });

        if (!response.ok) {
          const error = await response.json().catch(() => null);
          throw new Error(error?.error || "Erro ao criar despesa fixa");
        }

        toast.success("Despesa fixa criada! Aparecerá no planejamento dos próximos meses.");
        setIsOpen(false);
        setEditingTransaction(null);
        onSuccess();
        return;
      }

      // Regular transaction flow
      const selectedAccount = accounts.find((a) => a.id === formData.accountId);
      const isCreditCard = selectedAccount?.type === "credit_card";
      const canBeInstallment =
        formData.type === "expense" && isCreditCard && !editingTransaction;

      const payload = {
        budgetId: budgets[0].id,
        type: formData.type,
        amount: amountInCents,
        description: formData.description || undefined,
        accountId: formData.accountId,
        categoryId:
          formData.type === "expense" ? formData.categoryId || undefined : undefined,
        incomeSourceId:
          formData.type === "income" ? formData.incomeSourceId || undefined : undefined,
        toAccountId:
          formData.type === "transfer" ? formData.toAccountId || undefined : undefined,
        date: new Date(formData.date).toISOString(),
        status: "cleared", // Manual transactions are confirmed by default
        memberId: memberId || undefined,
        paidByMemberId: formData.paidByMemberId || defaultPaidByMemberId || memberId || undefined,
        // Installment fields (only for new credit card expenses)
        ...(canBeInstallment && formData.isInstallment
          ? {
              isInstallment: true,
              totalInstallments: formData.totalInstallments,
            }
          : {}),
      };

      if (editingTransaction) {
        const seriesParam = applyToSeries ? "?applyToSeries=true" : "";
        const response = await fetch(
          `/api/app/transactions/${editingTransaction.id}${seriesParam}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          }
        );

        if (!response.ok) {
          throw new Error("Erro ao atualizar transação");
        }

        toast.success(
          applyToSeries ? "Todas as parcelas atualizadas!" : "Transação atualizada!"
        );
      } else {
        const response = await fetch("/api/app/transactions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          throw new Error("Erro ao criar transação");
        }

        toast.success("Transação criada!");
      }

      setIsOpen(false);
      setEditingTransaction(null);
      onSuccess();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao salvar");
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, budgets, accounts, editingTransaction, applyToSeries, onSuccess, memberId, defaultPaidByMemberId]);

  return {
    // State
    isOpen,
    setIsOpen,
    editingTransaction,
    formData,
    setFormData,
    isSubmitting,
    applyToSeries,
    setApplyToSeries,
    // Actions
    openCreate,
    openEdit,
    handleSubmit,
    resetForm,
  };
}
