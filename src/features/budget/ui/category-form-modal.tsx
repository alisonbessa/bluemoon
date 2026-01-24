'use client';

import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { FormModalWrapper, BehaviorSelector } from '@/shared/molecules';
import { IconPicker } from '@/shared/ui/icon-color-picker';

interface Group {
  id: string;
  code: string;
  name: string;
  icon?: string | null;
}

// Props for create mode
interface CategoryCreateModalProps {
  mode: 'create';
  isOpen: boolean;
  onClose: () => void;
  onSave: () => Promise<void>;
  isSaving: boolean;
  group: Group | null;
  name: string;
  onNameChange: (name: string) => void;
  icon: string;
  onIconChange: (icon: string) => void;
  behavior: 'set_aside' | 'refill_up';
  onBehaviorChange: (behavior: 'set_aside' | 'refill_up') => void;
}

// Props for edit mode
interface CategoryEditModalProps {
  mode: 'edit';
  isOpen: boolean;
  onClose: () => void;
  onSave: () => Promise<void>;
  isSaving: boolean;
  categoryName: string;
  name: string;
  onNameChange: (name: string) => void;
  icon: string;
  onIconChange: (icon: string) => void;
}

type CategoryFormModalProps = CategoryCreateModalProps | CategoryEditModalProps;

/**
 * CategoryFormModal - Modal for creating or editing categories
 */
export function CategoryFormModal(props: CategoryFormModalProps) {
  if (props.mode === 'create') {
    return <CreateCategoryModal {...props} />;
  }
  return <EditCategoryModal {...props} />;
}

function CreateCategoryModal({
  isOpen,
  onClose,
  onSave,
  isSaving,
  group,
  name,
  onNameChange,
  icon,
  onIconChange,
  behavior,
  onBehaviorChange,
}: CategoryCreateModalProps) {
  if (!group) return null;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && name.trim()) {
      onSave();
    }
  };

  return (
    <FormModalWrapper
      open={isOpen}
      onOpenChange={(open) => !open && onClose()}
      title="Nova Categoria"
      description={`Adicionar categoria em ${group.icon || ''} ${group.name}`}
      isSubmitting={isSaving}
      onSubmit={onSave}
      submitLabel="Criar"
      submitDisabled={!name.trim()}
      size="sm"
    >
      <div className="grid gap-4">
        {/* Name Input */}
        <div className="grid gap-2">
          <Label htmlFor="categoryName">Nome</Label>
          <Input
            id="categoryName"
            placeholder="Ex: Netflix, Academia, Supermercado..."
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            onKeyDown={handleKeyDown}
            autoFocus
          />
        </div>

        {/* Icon Picker */}
        <IconPicker
          icon={icon}
          onIconChange={onIconChange}
        />

        {/* Behavior Selector */}
        <BehaviorSelector
          value={behavior}
          onChange={onBehaviorChange}
        />
      </div>
    </FormModalWrapper>
  );
}

function EditCategoryModal({
  isOpen,
  onClose,
  onSave,
  isSaving,
  categoryName,
  name,
  onNameChange,
  icon,
  onIconChange,
}: CategoryEditModalProps) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && name.trim()) {
      onSave();
    }
  };

  return (
    <FormModalWrapper
      open={isOpen}
      onOpenChange={(open) => !open && onClose()}
      title="Editar Categoria"
      description={`Atualize os dados da categoria ${categoryName}`}
      isSubmitting={isSaving}
      onSubmit={onSave}
      submitLabel="Salvar"
      submitDisabled={!name.trim()}
      size="sm"
    >
      <div className="grid gap-4">
        {/* Name Input */}
        <div className="grid gap-2">
          <Label htmlFor="editCategoryName">Nome</Label>
          <Input
            id="editCategoryName"
            placeholder="Nome da categoria"
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            onKeyDown={handleKeyDown}
            autoFocus
          />
        </div>

        {/* Icon Picker */}
        <IconPicker
          icon={icon}
          onIconChange={onIconChange}
        />
      </div>
    </FormModalWrapper>
  );
}
