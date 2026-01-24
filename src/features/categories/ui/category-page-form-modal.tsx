'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { FormModalWrapper, BehaviorSelector } from '@/shared/molecules';
import { IconPicker } from '@/shared/ui/icon-color-picker';
import type { Category, CategoryFormData, CategoryGroup, CategoryBehavior } from '../types';

interface CategoryPageFormModalProps {
  isOpen: boolean;
  editingCategory: Category | null;
  formData: CategoryFormData;
  isSubmitting: boolean;
  groups: CategoryGroup[];
  onClose: () => void;
  onUpdateField: <K extends keyof CategoryFormData>(field: K, value: CategoryFormData[K]) => void;
  onSubmit: () => Promise<void>;
}

export function CategoryPageFormModal({
  isOpen,
  editingCategory,
  formData,
  isSubmitting,
  groups,
  onClose,
  onUpdateField,
  onSubmit,
}: CategoryPageFormModalProps) {
  const isEditing = !!editingCategory;

  return (
    <FormModalWrapper
      open={isOpen}
      onOpenChange={(open) => !open && onClose()}
      title={isEditing ? 'Editar Categoria' : 'Nova Categoria'}
      description={
        isEditing
          ? 'Atualize os dados da categoria'
          : 'Crie uma nova categoria para organizar suas despesas'
      }
      isSubmitting={isSubmitting}
      onSubmit={onSubmit}
      submitLabel={isEditing ? 'Salvar' : 'Criar'}
      submitDisabled={!formData.name.trim() || (!isEditing && !formData.groupId)}
    >
      <div className="grid gap-4">
        {/* Name */}
        <div className="grid gap-2">
          <Label htmlFor="name">Nome</Label>
          <Input
            id="name"
            placeholder="Ex: Alimentação"
            value={formData.name}
            onChange={(e) => onUpdateField('name', e.target.value)}
            autoFocus
          />
        </div>

        {/* Icon Picker */}
        <IconPicker
          icon={formData.icon || '📌'}
          onIconChange={(icon) => onUpdateField('icon', icon)}
        />

        {/* Group (only for create) */}
        {!isEditing && (
          <div className="grid gap-2">
            <Label htmlFor="group">Grupo</Label>
            <Select
              value={formData.groupId}
              onValueChange={(value) => onUpdateField('groupId', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione um grupo" />
              </SelectTrigger>
              <SelectContent>
                {groups.map((group) => (
                  <SelectItem key={group.id} value={group.id}>
                    {group.icon} {group.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Behavior */}
        <BehaviorSelector
          value={formData.behavior}
          onChange={(value) => onUpdateField('behavior', value as CategoryBehavior)}
        />
      </div>
    </FormModalWrapper>
  );
}
