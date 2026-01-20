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
}

interface UseTransactionFormReturn {
  // State
  isOpen: boolean;
  setIsOpen: (value: boolean) => void;
  editingTransaction: Transaction | null;
  formData: TransactionFormData;
  setFormData: React.Dispatch<React.SetStateAction<TransactionFormData>>;
  isSubmitting: boolean;
  // Actions
  openCreate: () => void;
  openEdit: (transaction: Transaction) => void;
  handleSubmit: () => Promise<void>;
  resetForm: () => void;
}

export function useTransactionForm(
  options: UseTransactionFormOptions
): UseTransactionFormReturn {
  const { accounts, budgets, onSuccess } = options;

  const [isOpen, setIsOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<TransactionFormData>(initialFormData);

  const resetForm = useCallback(() => {
    setFormData({
      ...initialFormData,
      accountId: accounts[0]?.id || "",
      date: format(new Date(), "yyyy-MM-dd"),
    });
    setEditingTransaction(null);
  }, [accounts]);

  const openCreate = useCallback(() => {
    setFormData({
      ...initialFormData,
      accountId: accounts[0]?.id || "",
      date: format(new Date(), "yyyy-MM-dd"),
    });
    setEditingTransaction(null);
    setIsOpen(true);
  }, [accounts]);

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
      isInstallment: false, // Editing doesn't allow changing installment
      totalInstallments: 2,
    });
    setEditingTransaction(transaction);
    setIsOpen(true);
  }, []);

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
      // Check if this is an installment purchase
      const selectedAccount = accounts.find((a) => a.id === formData.accountId);
      const isCreditCard = selectedAccount?.type === "credit_card";
      const canBeInstallment =
        formData.type === "expense" && isCreditCard && !editingTransaction;

      const payload = {
        budgetId: budgets[0].id,
        type: formData.type,
        amount: parseCurrency(formData.amount),
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
        // Installment fields (only for new credit card expenses)
        ...(canBeInstallment && formData.isInstallment
          ? {
              isInstallment: true,
              totalInstallments: formData.totalInstallments,
            }
          : {}),
      };

      if (editingTransaction) {
        const response = await fetch(
          `/api/app/transactions/${editingTransaction.id}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          }
        );

        if (!response.ok) {
          throw new Error("Erro ao atualizar transação");
        }

        toast.success("Transação atualizada!");
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
  }, [formData, budgets, accounts, editingTransaction, onSuccess]);

  return {
    // State
    isOpen,
    setIsOpen,
    editingTransaction,
    formData,
    setFormData,
    isSubmitting,
    // Actions
    openCreate,
    openEdit,
    handleSubmit,
    resetForm,
  };
}
