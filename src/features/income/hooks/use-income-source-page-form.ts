'use client';

import { useState, useMemo, useCallback } from 'react';
import { toast } from 'sonner';
import type { IncomeSource, IncomeType, IncomeFrequency, IncomeFormData } from '../types';
import { ALLOWED_ACCOUNT_TYPES_BY_INCOME } from '../types';

interface Account {
  id: string;
  name: string;
  type: string;
  icon?: string | null;
}

interface Member {
  id: string;
  name: string;
}

interface UseIncomeSourcePageFormProps {
  budgetId: string | undefined;
  members: Member[];
  accounts: Account[];
  onSuccess: () => void;
  onTutorialAction?: () => void;
}

interface UseIncomeSourcePageFormReturn {
  // Form state
  isFormOpen: boolean;
  editingSource: IncomeSource | null;
  formData: IncomeFormData;
  errors: Record<string, boolean>;
  isSubmitting: boolean;
  filteredAccounts: Account[];

  // Actions
  openCreate: (type?: IncomeType) => void;
  openEdit: (source: IncomeSource) => void;
  closeForm: () => void;
  updateField: <K extends keyof IncomeFormData>(field: K, value: IncomeFormData[K]) => void;
  submit: () => Promise<void>;

  // Delete state
  deletingSource: IncomeSource | null;
  setDeletingSource: (source: IncomeSource | null) => void;
  confirmDelete: () => Promise<void>;
}

const DEFAULT_FORM_DATA: IncomeFormData = {
  name: '',
  type: 'salary',
  amount: 0,
  frequency: 'monthly',
  dayOfMonth: undefined,
  memberId: undefined,
  accountId: undefined,
};

export function useIncomeSourcePageForm({
  budgetId,
  members,
  accounts,
  onSuccess,
  onTutorialAction,
}: UseIncomeSourcePageFormProps): UseIncomeSourcePageFormReturn {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingSource, setEditingSource] = useState<IncomeSource | null>(null);
  const [deletingSource, setDeletingSource] = useState<IncomeSource | null>(null);
  const [formData, setFormData] = useState<IncomeFormData>(DEFAULT_FORM_DATA);
  const [errors, setErrors] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filter accounts based on selected income type
  const filteredAccounts = useMemo(() => {
    const allowedTypes = ALLOWED_ACCOUNT_TYPES_BY_INCOME[formData.type] || [];
    return accounts.filter((account) => allowedTypes.includes(account.type));
  }, [accounts, formData.type]);

  const openCreate = useCallback((type?: IncomeType) => {
    const incomeType = type || 'salary';
    setFormData({
      ...DEFAULT_FORM_DATA,
      type: incomeType,
      memberId: members[0]?.id,
    });
    setEditingSource(null);
    setErrors({});
    setIsFormOpen(true);
  }, [members]);

  const openEdit = useCallback((source: IncomeSource) => {
    setFormData({
      name: source.name,
      type: source.type,
      amount: source.amount,
      frequency: source.frequency,
      dayOfMonth: source.dayOfMonth || undefined,
      memberId: source.member?.id,
      accountId: source.account?.id,
    });
    setEditingSource(source);
    setErrors({});
    setIsFormOpen(true);
  }, []);

  const closeForm = useCallback(() => {
    setIsFormOpen(false);
    setEditingSource(null);
    setErrors({});
  }, []);

  const updateField = useCallback(<K extends keyof IncomeFormData>(field: K, value: IncomeFormData[K]) => {
    setFormData((prev) => {
      const newData = { ...prev, [field]: value };

      // Clear account if type changes and account is no longer valid
      if (field === 'type') {
        const newType = value as IncomeType;
        const allowedTypes = ALLOWED_ACCOUNT_TYPES_BY_INCOME[newType] || [];
        const currentAccount = accounts.find((a) => a.id === prev.accountId);
        if (currentAccount && !allowedTypes.includes(currentAccount.type)) {
          newData.accountId = undefined;
        }
      }

      return newData;
    });

    // Clear error when field is corrected
    if (errors[field]) {
      if (field === 'name' && typeof value === 'string' && value.trim()) {
        setErrors((prev) => ({ ...prev, name: false }));
      }
      if (field === 'amount' && typeof value === 'number' && value > 0) {
        setErrors((prev) => ({ ...prev, amount: false }));
      }
    }
  }, [accounts, errors]);

  const validateForm = useCallback((): boolean => {
    const newErrors: Record<string, boolean> = {};

    if (!formData.name.trim()) {
      newErrors.name = true;
    }

    if (formData.amount <= 0) {
      newErrors.amount = true;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  const submit = useCallback(async () => {
    if (!validateForm()) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    if (!budgetId) {
      toast.error('Nenhum orçamento encontrado');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        ...formData,
        budgetId,
      };

      if (editingSource) {
        const response = await fetch(`/api/app/income-sources/${editingSource.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          throw new Error('Erro ao atualizar fonte de renda');
        }

        toast.success('Fonte de renda atualizada!');
      } else {
        const response = await fetch('/api/app/income-sources', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          throw new Error('Erro ao criar fonte de renda');
        }

        toast.success('Fonte de renda adicionada!');
        onTutorialAction?.();
      }

      closeForm();
      onSuccess();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao salvar');
    } finally {
      setIsSubmitting(false);
    }
  }, [validateForm, budgetId, formData, editingSource, closeForm, onSuccess, onTutorialAction]);

  const confirmDelete = useCallback(async () => {
    if (!deletingSource) return;

    try {
      const response = await fetch(`/api/app/income-sources/${deletingSource.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Erro ao excluir fonte de renda');
      }

      toast.success('Fonte de renda removida!');
      setDeletingSource(null);
      onSuccess();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao excluir');
    }
  }, [deletingSource, onSuccess]);

  return {
    isFormOpen,
    editingSource,
    formData,
    errors,
    isSubmitting,
    filteredAccounts,
    openCreate,
    openEdit,
    closeForm,
    updateField,
    submit,
    deletingSource,
    setDeletingSource,
    confirmDelete,
  };
}
