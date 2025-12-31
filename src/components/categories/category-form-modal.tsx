'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import type { CategoryGroup } from '@/types';

// Emoji categories for picker
const EMOJI_CATEGORIES = {
  recent: {
    icon: '🕐',
    label: 'Recentes',
    emojis: ['📌', '🛒', '🍔', '🚗', '🏠', '💪', '🎬', '💰'],
  },
  food: {
    icon: '🍔',
    label: 'Comida',
    emojis: [
      '🛒', '🍔', '🍕', '🍜', '🍣', '🥗', '☕', '🍺', '🍷', '🥖', '🥩', '🛵', '🍽️',
      '🍰', '🧁',
    ],
  },
  transport: {
    icon: '🚗',
    label: 'Transporte',
    emojis: [
      '🚗', '🚌', '🚇', '✈️', '🚲', '⛽', '🅿️', '🚙', '🔧', '🛻', '🏍️', '🚕',
    ],
  },
  home: {
    icon: '🏠',
    label: 'Casa',
    emojis: [
      '🏠', '🏢', '💧', '💡', '🔥', '📶', '📱', '🧹', '🛋️', '🛏️', '🚿', '🧺', '🔑',
      '🏡',
    ],
  },
  health: {
    icon: '💪',
    label: 'Saúde',
    emojis: [
      '💪', '🏥', '💊', '🦷', '🧠', '🏃', '🧘', '💉', '🩺', '👁️', '❤️‍🩹', '🏋️',
    ],
  },
  entertainment: {
    icon: '🎬',
    label: 'Lazer',
    emojis: [
      '🎬', '📺', '🎵', '🎮', '📚', '✈️', '🏨', '🎭', '🎪', '🎯', '🎳', '⚽', '🏖️',
      '🎸',
    ],
  },
  money: {
    icon: '💰',
    label: 'Dinheiro',
    emojis: ['💰', '💳', '🧾', '🛡️', '❤️', '📈', '💵', '🏦', '💎', '🪙', '📊', '🎰'],
  },
  other: {
    icon: '📦',
    label: 'Outros',
    emojis: [
      '📌', '👕', '👟', '💅', '🎁', '🐕', '🐱', '📖', '✏️', '🌍', '💼', '💻', '👶',
      '🧸', '🍼', '📦',
    ],
  },
};

export interface CategoryFormData {
  name: string;
  icon: string;
  groupId: string;
  behavior: 'set_aside' | 'refill_up';
}

interface CategoryFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  isEditing: boolean;
  formData: CategoryFormData;
  setFormData: (data: CategoryFormData) => void;
  groups: CategoryGroup[];
  isSubmitting: boolean;
  onSubmit: () => void;
}

export function CategoryFormModal({
  isOpen,
  onClose,
  isEditing,
  formData,
  setFormData,
  groups,
  isSubmitting,
  onSubmit,
}: CategoryFormModalProps) {
  const [emojiCategory, setEmojiCategory] =
    useState<keyof typeof EMOJI_CATEGORIES>('recent');

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
          <div className="space-y-2">
            <Label htmlFor="name">Nome</Label>
            <Input
              id="name"
              placeholder="Ex: Alimentação"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
            />
          </div>

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
                    onClick={() => setFormData({ ...formData, icon: '' })}
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
                    onClick={() =>
                      setEmojiCategory(key as keyof typeof EMOJI_CATEGORIES)
                    }
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
                    onClick={() => setFormData({ ...formData, icon: emoji })}
                    className={cn(
                      'h-8 w-8 rounded flex items-center justify-center text-lg hover:bg-muted transition-colors',
                      formData.icon === emoji &&
                        'bg-primary/20 ring-2 ring-primary'
                    )}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {!isEditing && (
            <div className="space-y-2">
              <Label htmlFor="group">Grupo</Label>
              <Select
                value={formData.groupId}
                onValueChange={(value) =>
                  setFormData({ ...formData, groupId: value })
                }
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

          <div className="space-y-2">
            <Label htmlFor="behavior">Comportamento</Label>
            <Select
              value={formData.behavior}
              onValueChange={(value: 'set_aside' | 'refill_up') =>
                setFormData({ ...formData, behavior: value })
              }
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

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button onClick={onSubmit} disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEditing ? 'Salvar' : 'Criar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
