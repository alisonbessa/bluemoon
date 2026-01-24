'use client';

import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import type { Category, CategoryFormData, CategoryGroup } from '../types';

interface UseCategoryPageFormProps {
  budgetId: string | undefined;
  groups: CategoryGroup[];
  onSuccess: () => void;
}

interface UseCategoryPageFormReturn {
  // Form state
  isFormOpen: boolean;
  editingCategory: Category | null;
  formData: CategoryFormData;
  isSubmitting: boolean;

  // Actions
  openCreate: (groupId?: string) => void;
  openEdit: (category: Category) => void;
  closeForm: () => void;
  updateField: <K extends keyof CategoryFormData>(field: K, value: CategoryFormData[K]) => void;
  submit: () => Promise<void>;

  // Delete state
  deletingCategory: Category | null;
  setDeletingCategory: (category: Category | null) => void;
  confirmDelete: () => Promise<void>;
}

const DEFAULT_FORM_DATA: CategoryFormData = {
  name: '',
  icon: '',
  groupId: '',
  behavior: 'refill_up',
};

export function useCategoryPageForm({
  budgetId,
  groups,
  onSuccess,
}: UseCategoryPageFormProps): UseCategoryPageFormReturn {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState<CategoryFormData>(DEFAULT_FORM_DATA);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const openCreate = useCallback((groupId?: string) => {
    setFormData({
      ...DEFAULT_FORM_DATA,
      groupId: groupId || groups[0]?.id || '',
    });
    setEditingCategory(null);
    setIsFormOpen(true);
  }, [groups]);

  const openEdit = useCallback((category: Category) => {
    setFormData({
      name: category.name,
      icon: category.icon || '',
      groupId: category.groupId,
      behavior: category.behavior,
    });
    setEditingCategory(category);
    setIsFormOpen(true);
  }, []);

  const closeForm = useCallback(() => {
    setIsFormOpen(false);
    setEditingCategory(null);
  }, []);

  const updateField = useCallback(<K extends keyof CategoryFormData>(field: K, value: CategoryFormData[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }, []);

  const submit = useCallback(async () => {
    if (!formData.name.trim() || !formData.groupId) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    if (!budgetId) {
      toast.error('Nenhum orçamento encontrado');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingCategory) {
        const response = await fetch(`/api/app/categories/${editingCategory.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: formData.name,
            icon: formData.icon || null,
            behavior: formData.behavior,
          }),
        });

        if (!response.ok) {
          throw new Error('Erro ao atualizar categoria');
        }

        toast.success('Categoria atualizada!');
      } else {
        const response = await fetch('/api/app/categories', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            budgetId,
            groupId: formData.groupId,
            name: formData.name,
            icon: formData.icon || null,
            behavior: formData.behavior,
            suggestIcon: !formData.icon,
          }),
        });

        if (!response.ok) {
          throw new Error('Erro ao criar categoria');
        }

        toast.success('Categoria criada!');
      }

      closeForm();
      onSuccess();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao salvar');
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, budgetId, editingCategory, closeForm, onSuccess]);

  const confirmDelete = useCallback(async () => {
    if (!deletingCategory) return;

    try {
      const response = await fetch(`/api/app/categories/${deletingCategory.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Erro ao excluir categoria');
      }

      toast.success('Categoria excluída!');
      setDeletingCategory(null);
      onSuccess();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao excluir');
    }
  }, [deletingCategory, onSuccess]);

  return {
    isFormOpen,
    editingCategory,
    formData,
    isSubmitting,
    openCreate,
    openEdit,
    closeForm,
    updateField,
    submit,
    deletingCategory,
    setDeletingCategory,
    confirmDelete,
  };
}
