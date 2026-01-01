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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CurrencyInput } from "@/components/ui/currency-input";
import { IconColorPicker } from "@/components/ui/icon-color-picker";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Goal {
  id: string;
  name: string;
  icon: string;
  color: string;
  targetAmount: number;
  targetDate: string;
  accountId?: string | null;
}

interface Account {
  id: string;
  name: string;
  icon: string | null;
}

interface GoalFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  budgetId: string;
  editingGoal?: Goal | null;
  onSuccess?: () => void;
}

export function GoalFormModal({
  open,
  onOpenChange,
  budgetId,
  editingGoal,
  onSuccess,
}: GoalFormModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [formData, setFormData] = useState({
    name: editingGoal?.name || "",
    icon: editingGoal?.icon || "🎯",
    color: editingGoal?.color || "#8b5cf6",
    targetAmount: editingGoal?.targetAmount || 0, // stored in cents
    targetDate: editingGoal?.targetDate?.split("T")[0] || "",
    accountId: editingGoal?.accountId || "",
  });

  // Fetch accounts when modal opens
  useEffect(() => {
    if (open) {
      fetch("/api/app/accounts")
        .then((res) => res.json())
        .then((data) => setAccounts(data.accounts || []))
        .catch(console.error);
    }
  }, [open]);

  // Reset form when editingGoal changes
  useEffect(() => {
    if (editingGoal) {
      setFormData({
        name: editingGoal.name,
        icon: editingGoal.icon,
        color: editingGoal.color,
        targetAmount: editingGoal.targetAmount,
        targetDate: editingGoal.targetDate?.split("T")[0] || "",
        accountId: editingGoal.accountId || "",
      });
    } else {
      setFormData({
        name: "",
        icon: "🎯",
        color: "#8b5cf6",
        targetAmount: 0,
        targetDate: "",
        accountId: "",
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
      accountId: "",
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
    if (!formData.accountId) {
      toast.error("Selecione a conta destino");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        name: formData.name,
        icon: formData.icon,
        color: formData.color,
        targetAmount: formData.targetAmount,
        targetDate: formData.targetDate,
        accountId: formData.accountId,
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

          {/* Icon and Color */}
          <IconColorPicker
            icon={formData.icon}
            color={formData.color}
            onIconChange={(icon) => setFormData({ ...formData, icon })}
            onColorChange={(color) => setFormData({ ...formData, color })}
          />

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

          {/* Destination Account */}
          <div className="space-y-2">
            <Label htmlFor="goal-accountId">Conta destino</Label>
            <Select
              value={formData.accountId}
              onValueChange={(value) => setFormData({ ...formData, accountId: value })}
            >
              <SelectTrigger id="goal-accountId">
                <SelectValue placeholder="Selecione uma conta" />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    <span className="flex items-center gap-2">
                      <span>{account.icon || "💳"}</span>
                      <span>{account.name}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Conta onde o dinheiro da meta será guardado
            </p>
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
