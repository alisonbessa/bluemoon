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
import { IconPicker } from '@/shared/ui/icon-color-picker';
import type { CategoryGroup } from '@/types';

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

          {/* Icon Picker */}
          <IconPicker
            icon={formData.icon || '📌'}
            onIconChange={(icon) => setFormData({ ...formData, icon })}
          />

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
