'use client';

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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import type { Category, CategoryBehavior, Group } from '@/types/category';

// Emoji categories for icon picker
const EMOJI_CATEGORIES = {
  recent: ['🛒', '🍽️', '⛽', '💡', '📱', '💳', '🏥', '🎬'],
  food: ['🛒', '🍽️', '☕', '🥖', '🥩', '🍕', '🍔', '🍺', '🍷', '🍰', '🍦', '🥗', '🍜', '🍣', '🌮', '🥐'],
  transport: ['🚗', '⛽', '🚌', '🚇', '✈️', '🚕', '🏍️', '🚲', '🅿️', '🔧', '🚙', '🛵', '⚓', '🚁', '🚀', '🛻'],
  home: ['🏠', '🏢', '💡', '💧', '🔥', '📶', '📱', '🧹', '🛋️', '🛏️', '🚿', '🪴', '🔑', '🏗️', '🪟', '🚪'],
  health: ['💪', '🏥', '💊', '🦷', '🧠', '🏃', '🧘', '🥗', '💉', '🩺', '🩹', '👓', '🧴', '💅', '💇', '🧖'],
  entertainment: ['🎬', '📺', '🎵', '🎮', '📚', '🎭', '🎨', '🎪', '✈️', '🏨', '🏖️', '⛷️', '🎢', '🎡', '🎯', '🎲'],
  money: ['💰', '💳', '🏦', '📈', '💵', '🧾', '🛡️', '❤️', '💎', '🪙', '📊', '💸', '🎁', '🏆', '⭐', '🎖️'],
  other: ['📌', '👕', '👟', '🐕', '🐱', '👶', '🧸', '📖', '✏️', '💼', '💻', '📦', '🔔', '⚙️', '🎓', '🌍'],
};

const EMOJI_TABS = [
  { id: 'recent', icon: '🕐', label: 'Recentes' },
  { id: 'food', icon: '🍔', label: 'Comida' },
  { id: 'transport', icon: '🚗', label: 'Transporte' },
  { id: 'home', icon: '🏠', label: 'Casa' },
  { id: 'health', icon: '💪', label: 'Saúde' },
  { id: 'entertainment', icon: '🎬', label: 'Lazer' },
  { id: 'money', icon: '💰', label: 'Dinheiro' },
  { id: 'other', icon: '📦', label: 'Outros' },
];

type EmojiCategory = keyof typeof EMOJI_CATEGORIES;

interface EmojiPickerProps {
  selectedIcon: string;
  onSelectIcon: (icon: string) => void;
  iconMode: EmojiCategory;
  onChangeMode: (mode: EmojiCategory) => void;
}

function EmojiPicker({ selectedIcon, onSelectIcon, iconMode, onChangeMode }: EmojiPickerProps) {
  return (
    <div className="grid gap-2">
      <Label>
        Ícone {selectedIcon && <span className="ml-2 text-lg">{selectedIcon}</span>}
      </Label>

      {/* Emoji Category Tabs */}
      <div className="flex gap-1 border-b pb-1">
        {EMOJI_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChangeMode(tab.id as EmojiCategory)}
            className={cn(
              'p-1.5 rounded text-lg hover:bg-muted/50 transition-colors',
              iconMode === tab.id && 'bg-muted'
            )}
            title={tab.label}
          >
            {tab.icon}
          </button>
        ))}
      </div>

      {/* Emoji Grid */}
      <div className="grid grid-cols-8 gap-1 max-h-[140px] overflow-y-auto p-1">
        {EMOJI_CATEGORIES[iconMode].map((emoji) => (
          <button
            key={emoji}
            type="button"
            onClick={() => onSelectIcon(emoji)}
            className={cn(
              'p-2 text-xl rounded hover:bg-muted/50 transition-colors',
              selectedIcon === emoji && 'bg-primary/10 ring-1 ring-primary'
            )}
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
}

interface BehaviorSelectorProps {
  value: CategoryBehavior;
  onChange: (behavior: CategoryBehavior) => void;
}

function BehaviorSelector({ value, onChange }: BehaviorSelectorProps) {
  return (
    <div className="grid gap-2">
      <Label>Sobra do mês</Label>
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => onChange('refill_up')}
          className={cn(
            'flex flex-col items-start gap-0.5 rounded-lg border p-3 text-left transition-colors',
            value === 'refill_up'
              ? 'border-primary bg-primary/5'
              : 'border-muted hover:bg-muted/50'
          )}
        >
          <span className="font-medium text-sm">Zera</span>
          <span className="text-[11px] text-muted-foreground leading-tight">
            Reinicia todo mês
          </span>
        </button>
        <button
          type="button"
          onClick={() => onChange('set_aside')}
          className={cn(
            'flex flex-col items-start gap-0.5 rounded-lg border p-3 text-left transition-colors',
            value === 'set_aside'
              ? 'border-primary bg-primary/5'
              : 'border-muted hover:bg-muted/50'
          )}
        >
          <span className="font-medium text-sm">Acumula</span>
          <span className="text-[11px] text-muted-foreground leading-tight">
            Passa pro próximo
          </span>
        </button>
      </div>
      <p className="text-xs text-muted-foreground">
        {value === 'set_aside'
          ? 'Ideal para prazeres, viagens e metas de economia'
          : 'Ideal para gastos fixos como aluguel e contas'}
      </p>
    </div>
  );
}

// ==================== Create Category Modal ====================

interface CreateCategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  group: Group | null;
  name: string;
  setName: (name: string) => void;
  icon: string;
  setIcon: (icon: string) => void;
  iconMode: EmojiCategory;
  setIconMode: (mode: EmojiCategory) => void;
  behavior: CategoryBehavior;
  setBehavior: (behavior: CategoryBehavior) => void;
  isCreating: boolean;
  onCreate: () => void;
}

export function CreateCategoryModal({
  isOpen,
  onClose,
  group,
  name,
  setName,
  icon,
  setIcon,
  iconMode,
  setIconMode,
  behavior,
  setBehavior,
  isCreating,
  onCreate,
}: CreateCategoryModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Nova Categoria</DialogTitle>
          <DialogDescription>
            Adicionar categoria em {group?.icon} {group?.name}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="categoryName">Nome</Label>
            <Input
              id="categoryName"
              placeholder="Ex: Netflix, Academia, Supermercado..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && name.trim()) {
                  onCreate();
                }
              }}
              autoFocus
            />
          </div>

          <EmojiPicker
            selectedIcon={icon}
            onSelectIcon={setIcon}
            iconMode={iconMode}
            onChangeMode={setIconMode}
          />

          <BehaviorSelector value={behavior} onChange={setBehavior} />
        </div>

        <DialogFooter className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={isCreating} className="w-1/4">
            Cancelar
          </Button>
          <Button onClick={onCreate} disabled={isCreating || !name.trim()} className="w-1/4">
            {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Criar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ==================== Edit Category Modal ====================

interface EditCategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  category: Category | null;
  name: string;
  setName: (name: string) => void;
  icon: string;
  setIcon: (icon: string) => void;
  iconMode: EmojiCategory;
  setIconMode: (mode: EmojiCategory) => void;
  isUpdating: boolean;
  onUpdate: () => void;
}

export function EditCategoryModal({
  isOpen,
  onClose,
  name,
  setName,
  icon,
  setIcon,
  iconMode,
  setIconMode,
  isUpdating,
  onUpdate,
}: EditCategoryModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Editar Categoria</DialogTitle>
          <DialogDescription>Altere o nome ou ícone da categoria</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="editCategoryName">Nome</Label>
            <Input
              id="editCategoryName"
              placeholder="Nome da categoria"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && name.trim()) {
                  onUpdate();
                }
              }}
              autoFocus
            />
          </div>

          <EmojiPicker
            selectedIcon={icon}
            onSelectIcon={setIcon}
            iconMode={iconMode}
            onChangeMode={setIconMode}
          />
        </div>

        <DialogFooter className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={isUpdating} className="w-1/4">
            Cancelar
          </Button>
          <Button onClick={onUpdate} disabled={isUpdating || !name.trim()} className="w-1/4">
            {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ==================== Delete Category Dialog ====================

interface DeleteCategoryDialogProps {
  isOpen: boolean;
  onClose: () => void;
  category: Category | null;
  isDeleting: boolean;
  onDelete: () => void;
}

export function DeleteCategoryDialog({
  isOpen,
  onClose,
  category,
  isDeleting,
  onDelete,
}: DeleteCategoryDialogProps) {
  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir categoria?</AlertDialogTitle>
          <AlertDialogDescription>
            Tem certeza que deseja excluir a categoria &quot;{category?.name}&quot;?
            Esta ação não pode ser desfeita.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={onDelete}
            disabled={isDeleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Excluir
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
