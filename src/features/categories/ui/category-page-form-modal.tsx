'use client';

import { Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { cn } from '@/shared/lib/utils';
import type { Category, CategoryFormData, CategoryGroup, CategoryBehavior } from '../types';
import { EMOJI_CATEGORIES, type EmojiCategoryKey } from '../hooks/use-category-page-form';

interface CategoryPageFormModalProps {
  isOpen: boolean;
  editingCategory: Category | null;
  formData: CategoryFormData;
  isSubmitting: boolean;
  emojiCategory: EmojiCategoryKey;
  groups: CategoryGroup[];
  onClose: () => void;
  onUpdateField: <K extends keyof CategoryFormData>(field: K, value: CategoryFormData[K]) => void;
  onSetEmojiCategory: (category: EmojiCategoryKey) => void;
  onSubmit: () => Promise<void>;
}

export function CategoryPageFormModal({
  isOpen,
  editingCategory,
  formData,
  isSubmitting,
  emojiCategory,
  groups,
  onClose,
  onUpdateField,
  onSetEmojiCategory,
  onSubmit,
}: CategoryPageFormModalProps) {
  const isEditing = !!editingCategory;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Editar Categoria' : 'Nova Categoria'}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Atualize os dados da categoria'
              : 'Crie uma nova categoria para organizar suas despesas'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Nome</Label>
            <Input
              id="name"
              placeholder="Ex: Alimentação"
              value={formData.name}
              onChange={(e) => onUpdateField('name', e.target.value)}
            />
          </div>

          {/* Icon Picker */}
          <div className="space-y-2">
            <Label>Ícone</Label>
            <div className="space-y-3">
              {/* Selected emoji display */}
              <div className="flex items-center gap-2">
                <div className="h-10 w-10 rounded-lg border bg-muted flex items-center justify-center text-xl">
                  {formData.icon || '📌'}
                </div>
                {formData.icon && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onUpdateField('icon', '')}
                  >
                    Limpar
                  </Button>
                )}
              </div>

              {/* Emoji category tabs */}
              <div className="flex gap-1 flex-wrap">
                {Object.entries(EMOJI_CATEGORIES).map(([key, cat]) => (
                  <button
                    key={key}
                    onClick={() => onSetEmojiCategory(key as EmojiCategoryKey)}
                    className={cn(
                      'px-2 py-1 rounded text-sm flex items-center gap-1 transition-colors',
                      emojiCategory === key
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted hover:bg-muted/80'
                    )}
                  >
                    <span>{cat.icon}</span>
                    <span className="hidden sm:inline">{cat.label}</span>
                  </button>
                ))}
              </div>

              {/* Emoji grid */}
              <div className="grid grid-cols-8 gap-1 p-2 border rounded-lg bg-muted/30 max-h-32 overflow-y-auto">
                {EMOJI_CATEGORIES[emojiCategory].emojis.map((emoji, idx) => (
                  <button
                    key={idx}
                    onClick={() => onUpdateField('icon', emoji)}
                    className={cn(
                      'h-8 w-8 rounded flex items-center justify-center text-lg hover:bg-muted transition-colors',
                      formData.icon === emoji && 'bg-primary/20 ring-2 ring-primary'
                    )}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Group (only for create) */}
          {!isEditing && (
            <div className="space-y-2">
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
          <div className="space-y-2">
            <Label htmlFor="behavior">Comportamento</Label>
            <Select
              value={formData.behavior}
              onValueChange={(value) => onUpdateField('behavior', value as CategoryBehavior)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="refill_up">
                  Recorrente (o valor é renovado todo mês)
                </SelectItem>
                <SelectItem value="set_aside">
                  Acumular (o valor não usado passa para o próximo mês)
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {formData.behavior === 'refill_up'
                ? 'O saldo é zerado e recarregado todo mês.'
                : 'O saldo não usado acumula para o próximo mês.'}
            </p>
          </div>
        </div>

        <DialogFooter className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
            className="w-1/4"
          >
            Cancelar
          </Button>
          <Button onClick={onSubmit} disabled={isSubmitting} className="w-1/4">
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEditing ? 'Salvar' : 'Criar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
