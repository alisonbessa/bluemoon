'use client';

import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import type { CategoryBehavior } from '@/features/categories';

type IconMode = 'recent' | 'food' | 'transport' | 'home' | 'health' | 'entertainment' | 'money' | 'other';

// Simplified category type for form (subset of full Category)
interface CategoryForForm {
  id: string;
  name: string;
  icon?: string | null;
  behavior: CategoryBehavior;
  plannedAmount: number;
}

interface UseCategoryFormOptions {
  budgetId: string;
  onSuccess?: () => void;
}

interface UseCategoryFormReturn {
  // Create mode
  isCreateOpen: boolean;
  createGroupId: string | null;
  openCreate: (groupId: string, groupCode: string) => void;
  closeCreate: () => void;

  // Edit mode
  isEditOpen: boolean;
  editingCategory: CategoryForForm | null;
  openEdit: (category: CategoryForForm) => void;
  closeEdit: () => void;

  // Delete mode
  deletingCategory: CategoryForForm | null;
  setDeletingCategory: (category: CategoryForForm | null) => void;

  // Create form state
  createName: string;
  setCreateName: (name: string) => void;
  createIcon: string;
  setCreateIcon: (icon: string) => void;
  createIconMode: IconMode;
  setCreateIconMode: (mode: IconMode) => void;
  createBehavior: CategoryBehavior;
  setCreateBehavior: (behavior: CategoryBehavior) => void;

  // Edit form state
  editName: string;
  setEditName: (name: string) => void;
  editIcon: string;
  setEditIcon: (icon: string) => void;
  editIconMode: IconMode;
  setEditIconMode: (mode: IconMode) => void;

  // Actions
  saveCreate: () => Promise<void>;
  saveEdit: () => Promise<void>;
  confirmDelete: () => Promise<void>;

  // Loading states
  isCreating: boolean;
  isUpdating: boolean;
  isDeleting: boolean;
}

// Default behaviors by group code
const GROUP_DEFAULT_BEHAVIORS: Record<string, CategoryBehavior> = {
  essential: 'refill_up',
  lifestyle: 'set_aside',
  pleasures: 'set_aside',
  goals: 'set_aside',
  investments: 'set_aside',
};

/**
 * Hook for managing category CRUD operations
 *
 * Handles:
 * - Creating new categories
 * - Editing existing categories
 * - Deleting categories
 */
export function useCategoryForm({
  budgetId,
  onSuccess,
}: UseCategoryFormOptions): UseCategoryFormReturn {
  // Create state
  const [createGroupId, setCreateGroupId] = useState<string | null>(null);
  const [createName, setCreateName] = useState('');
  const [createIcon, setCreateIcon] = useState('');
  const [createIconMode, setCreateIconMode] = useState<IconMode>('recent');
  const [createBehavior, setCreateBehavior] = useState<CategoryBehavior>('refill_up');
  const [isCreating, setIsCreating] = useState(false);

  // Edit state
  const [editingCategory, setEditingCategory] = useState<CategoryForForm | null>(null);
  const [editName, setEditName] = useState('');
  const [editIcon, setEditIcon] = useState('');
  const [editIconMode, setEditIconMode] = useState<IconMode>('recent');
  const [isUpdating, setIsUpdating] = useState(false);

  // Delete state
  const [deletingCategory, setDeletingCategory] = useState<CategoryForForm | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Open create modal
  const openCreate = useCallback((groupId: string, groupCode: string) => {
    setCreateGroupId(groupId);
    setCreateName('');
    setCreateIcon('');
    setCreateIconMode('recent');
    const defaultBehavior = GROUP_DEFAULT_BEHAVIORS[groupCode] || 'refill_up';
    setCreateBehavior(defaultBehavior);
  }, []);

  // Close create modal
  const closeCreate = useCallback(() => {
    setCreateGroupId(null);
  }, []);

  // Open edit modal
  const openEdit = useCallback((category: CategoryForForm) => {
    setEditingCategory(category);
    setEditName(category.name);
    setEditIcon(category.icon || '');
    setEditIconMode('recent');
  }, []);

  // Close edit modal
  const closeEdit = useCallback(() => {
    setEditingCategory(null);
  }, []);

  // Create category
  const saveCreate = useCallback(async () => {
    if (!createGroupId || !createName.trim() || !budgetId) return;

    setIsCreating(true);
    try {
      const response = await fetch('/api/app/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          budgetId,
          groupId: createGroupId,
          name: createName.trim(),
          icon: createIcon || null,
          behavior: createBehavior,
          suggestIcon: !createIcon,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Erro ao criar categoria');
      }

      toast.success('Categoria criada!');
      setCreateGroupId(null);
      setCreateName('');
      setCreateIcon('');
      setCreateIconMode('recent');
      setCreateBehavior('refill_up');
      onSuccess?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao criar categoria');
    } finally {
      setIsCreating(false);
    }
  }, [createGroupId, createName, createIcon, createBehavior, budgetId, onSuccess]);

  // Update category
  const saveEdit = useCallback(async () => {
    if (!editingCategory || !editName.trim()) return;

    setIsUpdating(true);
    try {
      const response = await fetch(`/api/app/categories/${editingCategory.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editName.trim(),
          icon: editIcon || null,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Erro ao atualizar categoria');
      }

      toast.success('Categoria atualizada!');
      setEditingCategory(null);
      onSuccess?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao atualizar categoria');
    } finally {
      setIsUpdating(false);
    }
  }, [editingCategory, editName, editIcon, onSuccess]);

  // Delete category
  const confirmDelete = useCallback(async () => {
    if (!deletingCategory) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/app/categories/${deletingCategory.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Erro ao excluir categoria');
      }

      toast.success('Categoria excluída!');
      setDeletingCategory(null);
      onSuccess?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao excluir categoria');
    } finally {
      setIsDeleting(false);
    }
  }, [deletingCategory, onSuccess]);

  return {
    // Create mode
    isCreateOpen: !!createGroupId,
    createGroupId,
    openCreate,
    closeCreate,

    // Edit mode
    isEditOpen: !!editingCategory,
    editingCategory,
    openEdit,
    closeEdit,

    // Delete mode
    deletingCategory,
    setDeletingCategory,

    // Create form state
    createName,
    setCreateName,
    createIcon,
    setCreateIcon,
    createIconMode,
    setCreateIconMode,
    createBehavior,
    setCreateBehavior,

    // Edit form state
    editName,
    setEditName,
    editIcon,
    setEditIcon,
    editIconMode,
    setEditIconMode,

    // Actions
    saveCreate,
    saveEdit,
    confirmDelete,

    // Loading states
    isCreating,
    isUpdating,
    isDeleting,
  };
}
