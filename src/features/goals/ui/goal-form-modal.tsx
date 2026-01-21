"use client";

import { useState, useEffect, useMemo } from "react";
import { FormModalWrapper } from "@/shared/molecules";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { CurrencyInput } from "@/shared/ui/currency-input";
import { IconPicker } from "@/shared/ui/icon-color-picker";
import { toast } from "sonner";

// Colors for random selection
const GOAL_COLORS = [
  "#8b5cf6", "#ec4899", "#ef4444", "#f97316",
  "#eab308", "#22c55e", "#14b8a6", "#06b6d4",
  "#3b82f6", "#6366f1"
];

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

function getRandomColor() {
  return GOAL_COLORS[Math.floor(Math.random() * GOAL_COLORS.length)];
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

  // Random color for new goals - memoized to not change on re-renders
  const randomColor = useMemo(() => getRandomColor(), [open, editingGoal]);

  const [formData, setFormData] = useState({
    name: editingGoal?.name || "",
    icon: editingGoal?.icon || "🎯",
    color: editingGoal?.color || randomColor,
    targetAmount: editingGoal?.targetAmount || 0, // stored in cents
    initialAmount: 0, // only for creation
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
        initialAmount: 0,
        targetDate: editingGoal.targetDate?.split("T")[0] || "",
        accountId: editingGoal.accountId || "",
      });
    } else {
      setFormData({
        name: "",
        icon: "🎯",
        color: randomColor,
        targetAmount: 0,
        initialAmount: 0,
        targetDate: "",
        accountId: "",
      });
    }
  }, [editingGoal, open, randomColor]);

  const resetForm = () => {
    setFormData({
      name: "",
      icon: "🎯",
      color: getRandomColor(),
      targetAmount: 0,
      initialAmount: 0,
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
        initialAmount: formData.initialAmount,
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
    <FormModalWrapper
      open={open}
      onOpenChange={onOpenChange}
      title={editingGoal ? "Editar Meta" : "Nova Meta"}
      description={
        editingGoal
          ? "Altere os dados da sua meta financeira"
          : "Defina uma meta financeira com valor e prazo"
      }
      isSubmitting={isSubmitting}
      onSubmit={handleSubmit}
      submitLabel={editingGoal ? "Salvar" : "Criar Meta"}
    >
      <div className="space-y-4">
        {/* Row 1: Name */}
        <div className="space-y-2">
          <Label htmlFor="goal-name">Nome da meta</Label>
          <Input
            id="goal-name"
            placeholder="Ex: Viagem Disney, Casa própria..."
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />
        </div>

        {/* Icon Picker (without color - auto-generated) */}
        <IconPicker
          icon={formData.icon}
          onIconChange={(icon) => setFormData({ ...formData, icon })}
        />

        {/* Row 2: Target Amount + Initial Amount */}
        <div className="grid grid-cols-2 gap-4">
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
          {!editingGoal && (
            <div className="space-y-2">
              <Label htmlFor="goal-initialAmount">Valor inicial</Label>
              <CurrencyInput
                id="goal-initialAmount"
                value={formData.initialAmount}
                onChange={(valueInCents) =>
                  setFormData({ ...formData, initialAmount: valueInCents })
                }
                placeholder="0,00"
              />
            </div>
          )}
        </div>

        {/* Row 3: Target Date + Destination Account */}
        <div className="grid grid-cols-2 gap-4">
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
          </div>
        </div>
      </div>
    </FormModalWrapper>
  );
}
