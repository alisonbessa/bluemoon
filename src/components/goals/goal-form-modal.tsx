"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Goal {
  id: string;
  name: string;
  icon: string;
  color: string;
  targetAmount: number;
  targetDate: string;
}

interface GoalFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  budgetId: string;
  editingGoal?: Goal | null;
  onSuccess?: () => void;
}

const EMOJI_OPTIONS = ["🎯", "✈️", "🏠", "🚗", "💍", "🎓", "💻", "📱", "🏖️", "💰", "🎁", "🛒", "👴"];
const COLOR_OPTIONS = [
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#f43f5e", // rose
  "#ef4444", // red
  "#f97316", // orange
  "#eab308", // yellow
  "#22c55e", // green
  "#14b8a6", // teal
  "#06b6d4", // cyan
  "#3b82f6", // blue
  "#6366f1", // indigo
  "#a855f7", // purple
];

export function GoalFormModal({
  open,
  onOpenChange,
  budgetId,
  editingGoal,
  onSuccess,
}: GoalFormModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: editingGoal?.name || "",
    icon: editingGoal?.icon || "🎯",
    color: editingGoal?.color || "#8b5cf6",
    targetAmount: editingGoal?.targetAmount || 0, // stored in cents
    targetDate: editingGoal?.targetDate?.split("T")[0] || "",
  });

  // Reset form when editingGoal changes
  useEffect(() => {
    if (editingGoal) {
      setFormData({
        name: editingGoal.name,
        icon: editingGoal.icon,
        color: editingGoal.color,
        targetAmount: editingGoal.targetAmount,
        targetDate: editingGoal.targetDate?.split("T")[0] || "",
      });
    } else {
      setFormData({
        name: "",
        icon: "🎯",
        color: "#8b5cf6",
        targetAmount: 0,
        targetDate: "",
      });
    }
  }, [editingGoal, open]);

  const resetForm = () => {
    setFormData({
      name: "",
      icon: "🎯",
      color: "#8b5cf6",
      targetAmount: 0,
      targetDate: "",
    });
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast.error("Nome da meta é obrigatório");
      return;
    }
    if (formData.targetAmount <= 0) {
      toast.error("Valor alvo deve ser maior que zero");
      return;
    }
    if (!formData.targetDate) {
      toast.error("Data limite é obrigatória");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        ...formData,
        targetAmount: formData.targetAmount, // already in cents
        budgetId,
      };

      let response;
      if (editingGoal) {
        response = await fetch(`/api/app/goals/${editingGoal.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        response = await fetch("/api/app/goals", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Erro ao salvar meta");
      }

      toast.success(editingGoal ? "Meta atualizada!" : "Meta criada!");
      onOpenChange(false);
      resetForm();
      onSuccess?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao salvar meta");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{editingGoal ? "Editar Meta" : "Nova Meta"}</DialogTitle>
          <DialogDescription>
            {editingGoal
              ? "Altere os dados da sua meta financeira"
              : "Defina uma meta financeira com valor e prazo"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="goal-name">Nome da meta</Label>
            <Input
              id="goal-name"
              placeholder="Ex: Viagem Disney, Casa própria..."
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>

          {/* Icon */}
          <div className="space-y-2">
            <Label>Ícone</Label>
            <div className="flex flex-wrap gap-2">
              {EMOJI_OPTIONS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setFormData({ ...formData, icon: emoji })}
                  className={cn(
                    "w-10 h-10 rounded-lg text-xl flex items-center justify-center transition-all",
                    formData.icon === emoji
                      ? "bg-primary/20 ring-2 ring-primary"
                      : "bg-muted hover:bg-muted/80"
                  )}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          {/* Color */}
          <div className="space-y-2">
            <Label>Cor</Label>
            <div className="flex flex-wrap gap-2">
              {COLOR_OPTIONS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setFormData({ ...formData, color })}
                  className={cn(
                    "w-8 h-8 rounded-full transition-all",
                    formData.color === color && "ring-2 ring-offset-2 ring-primary"
                  )}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          {/* Target Amount */}
          <div className="space-y-2">
            <Label htmlFor="goal-targetAmount">Valor alvo</Label>
            <CurrencyInput
              id="goal-targetAmount"
              value={formData.targetAmount}
              onChange={(valueInCents) =>
                setFormData({ ...formData, targetAmount: valueInCents })
              }
              placeholder="0,00"
            />
          </div>

          {/* Target Date */}
          <div className="space-y-2">
            <Label htmlFor="goal-targetDate">Data limite</Label>
            <Input
              id="goal-targetDate"
              type="date"
              value={formData.targetDate}
              onChange={(e) => setFormData({ ...formData, targetDate: e.target.value })}
              min={new Date().toISOString().split("T")[0]}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {editingGoal ? "Salvar" : "Criar Meta"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
