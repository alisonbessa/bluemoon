'use client';

import { useState, useCallback, useMemo } from 'react';
import { toast } from 'sonner';

type IncomeType = 'salary' | 'benefit' | 'freelance' | 'rental' | 'investment' | 'other';
type IncomeFrequency = 'monthly' | 'biweekly' | 'weekly';

interface IncomeSource {
  id: string;
  name: string;
  type: IncomeType;
  amount: number;
  frequency: IncomeFrequency;
  dayOfMonth?: number | null;
  memberId: string | null;
  member?: { id: string; name: string; color?: string | null } | null;
  account?: { id: string; name: string; icon?: string | null } | null;
  isAutoConfirm?: boolean;
}

interface Account {
  id: string;
  name: string;
  type: string;
  icon?: string | null;
}

interface Member {
  id: string;
  name: string;
  color: string | null;
}

interface IncomeSourceFormData {
  name: string;
  type: IncomeType;
  amount: number;
  frequency: IncomeFrequency;
  dayOfMonth?: number;
  memberId?: string;
  accountId?: string;
  isAutoConfirm?: boolean;
}

interface UseIncomeSourceFormOptions {
  budgetId: string;
  members: Member[];
  accounts: Account[];
  onSuccess?: () => void;
}

interface UseIncomeSourceFormReturn {
  // Create mode
  isFormOpen: boolean;
  isEditing: boolean;
  editingSource: IncomeSource | null;
  openCreate: (preselectedMemberId?: string) => void;
  openEdit: (source: IncomeSource) => void;
  closeForm: () => void;

  // Delete mode
  deletingSource: IncomeSource | null;
  setDeletingSource: (source: IncomeSource | null) => void;

  // Form state
  formData: IncomeSourceFormData;
  setFormField: <K extends keyof IncomeSourceFormData>(
    field: K,
    value: IncomeSourceFormData[K]
  ) => void;
  errors: Record<string, boolean>;

  // Filtered accounts based on income type
  filteredAccounts: Account[];

  // Actions
  submit: () => Promise<void>;
  confirmDelete: () => Promise<void>;

  // Loading states
  isSubmitting: boolean;
  isDeleting: boolean;
}

// Account types allowed for each income type
const ALLOWED_ACCOUNT_TYPES_BY_INCOME: Record<IncomeType, string[]> = {
  salary: ['checking', 'savings'],
  freelance: ['checking', 'savings'],
  rental: ['checking', 'savings'],
  investment: ['checking', 'savings', 'investment'],
  benefit: ['benefit'],
  other: ['checking', 'savings', 'credit_card', 'cash', 'investment', 'benefit'],
};

const initialFormData: IncomeSourceFormData = {
  name: '',
  type: 'salary',
  amount: 0,
  frequency: 'monthly',
  dayOfMonth: undefined,
  memberId: undefined,
  accountId: undefined,
  isAutoConfirm: false,
};

/**
 * Hook for managing income source CRUD operations
 */
export function useIncomeSourceForm({
  budgetId,
  members,
  accounts,
  onSuccess,
}: UseIncomeSourceFormOptions): UseIncomeSourceFormReturn {
  // Form open state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingSource, setEditingSource] = useState<IncomeSource | null>(null);
  const [formData, setFormData] = useState<IncomeSourceFormData>(initialFormData);
  const [errors, setErrors] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Delete state
  const [deletingSource, setDeletingSource] = useState<IncomeSource | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Filtered accounts based on income type
  const filteredAccounts = useMemo(() => {
    const allowedTypes = ALLOWED_ACCOUNT_TYPES_BY_INCOME[formData.type] || [];
    return accounts.filter((account) => allowedTypes.includes(account.type));
  }, [accounts, formData.type]);

  // Open create form
  const openCreate = useCallback(
    (preselectedMemberId?: string) => {
      setFormData({
        ...initialFormData,
        memberId: preselectedMemberId || members[0]?.id,
      });
      setEditingSource(null);
      setErrors({});
      setIsFormOpen(true);
    },
    [members]
  );

  // Open edit form
  const openEdit = useCallback((source: IncomeSource) => {
    setFormData({
      name: source.name,
      type: source.type,
      amount: source.amount,
      frequency: source.frequency,
      dayOfMonth: source.dayOfMonth || undefined,
      memberId: source.member?.id || source.memberId || undefined,
      accountId: source.account?.id,
      isAutoConfirm: source.isAutoConfirm || false,
    });
    setEditingSource(source);
    setErrors({});
    setIsFormOpen(true);
  }, []);

  // Close form
  const closeForm = useCallback(() => {
    setIsFormOpen(false);
    setEditingSource(null);
    setErrors({});
  }, []);

  // Set individual form field
  const setFormField = useCallback(
    <K extends keyof IncomeSourceFormData>(field: K, value: IncomeSourceFormData[K]) => {
      setFormData((prev) => ({ ...prev, [field]: value }));
      // Clear error when field is updated
      if (errors[field]) {
        setErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors[field];
          return newErrors;
        });
      }
    },
    [errors]
  );

  // Validate form
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

  // Submit form
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
      }

      setIsFormOpen(false);
      setEditingSource(null);
      setErrors({});
      onSuccess?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao salvar');
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, editingSource, budgetId, validateForm, onSuccess]);

  // Delete income source
  const confirmDelete = useCallback(async () => {
    if (!deletingSource) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/app/income-sources/${deletingSource.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Erro ao excluir fonte de renda');
      }

      toast.success('Fonte de renda excluída!');
      setDeletingSource(null);
      onSuccess?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao excluir');
    } finally {
      setIsDeleting(false);
    }
  }, [deletingSource, onSuccess]);

  return {
    // Form state
    isFormOpen,
    isEditing: !!editingSource,
    editingSource,
    openCreate,
    openEdit,
    closeForm,

    // Delete mode
    deletingSource,
    setDeletingSource,

    // Form data
    formData,
    setFormField,
    errors,

    // Filtered accounts
    filteredAccounts,

    // Actions
    submit,
    confirmDelete,

    // Loading states
    isSubmitting,
    isDeleting,
  };
}
