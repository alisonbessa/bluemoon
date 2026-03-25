"use client";

import { useState, useEffect, useMemo } from "react";
import { FormModalWrapper, AccountSelector } from "@/shared/molecules";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { CurrencyInput } from "@/shared/ui/currency-input";
import { IconPicker } from "@/shared/ui/icon-color-picker";
import { Users } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { useViewMode } from "@/shared/providers/view-mode-provider";
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
  memberId?: string | null;
}

interface Member {
  id: string;
  name: string;
  color?: string | null;
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
  members?: Member[];
  currentUserMemberId?: string;
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
  members = [],
  currentUserMemberId,
  onSuccess,
}: GoalFormModalProps) {
  const { viewMode, isUnifiedPrivacy } = useViewMode();

  // Default memberId based on viewMode: "mine" → current user, "shared"/"all" → conjunta
  // "all" is just a view aggregating mine + shared, so creating in "all" defaults to shared
  const defaultMemberId = viewMode === "mine" ? currentUserMemberId : undefined;
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
    memberId: editingGoal?.memberId ?? defaultMemberId as string | undefined,
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
        memberId: editingGoal.memberId ?? undefined,
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
        memberId: defaultMemberId,
      });
    }
  }, [editingGoal, open, randomColor, defaultMemberId]);

  const resetForm = () => {
    setFormData({
      name: "",
      icon: "🎯",
      color: getRandomColor(),
      targetAmount: 0,
      initialAmount: 0,
      targetDate: "",
      accountId: "",
      memberId: defaultMemberId,
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
        memberId: formData.memberId || null,
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
      submitLabel={editingGoal ? "Salvar" : "Criar"}
    >
      <div className="grid gap-4">
        {/* Goal type selector (only for Duo budgets, hidden in unified privacy) */}
        {members.length > 1 && !isUnifiedPrivacy && (
          <div className="grid gap-2">
            <Label>Tipo de meta</Label>
            <div className="grid grid-cols-2 gap-2">
              {/* Shared option */}
              <button
                type="button"
                onClick={() => setFormData({ ...formData, memberId: undefined })}
                className={cn(
                  "flex items-center gap-2 rounded-lg border-2 px-3 py-2.5 text-sm font-medium transition-all text-left",
                  !formData.memberId
                    ? "border-violet-500 bg-violet-50 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300 dark:border-violet-400"
                    : "border-muted hover:border-muted-foreground/30 text-muted-foreground"
                )}
              >
                <Users className="h-4 w-4 shrink-0" />
                <span>Conjunta</span>
              </button>
              {/* Per-member options */}
              {members.map((member) => (
                <button
                  key={member.id}
                  type="button"
                  onClick={() => setFormData({ ...formData, memberId: member.id })}
                  className={cn(
                    "flex items-center gap-2 rounded-lg border-2 px-3 py-2.5 text-sm font-medium transition-all text-left",
                    formData.memberId === member.id
                      ? "border-violet-500 bg-violet-50 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300 dark:border-violet-400"
                      : "border-muted hover:border-muted-foreground/30 text-muted-foreground"
                  )}
                >
                  <span
                    className="h-3 w-3 rounded-full shrink-0"
                    style={{ backgroundColor: member.color || '#6366f1' }}
                  />
                  <span className="truncate">Só {member.name.split(' ')[0]}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Row 1: Name */}
        <div className="grid gap-2">
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
        <div className={`grid gap-4 ${!editingGoal ? 'grid-cols-2' : ''}`}>
          <div className="grid gap-2">
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
            <div className="grid gap-2">
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
          <div className="grid gap-2">
            <Label htmlFor="goal-targetDate">Data limite</Label>
            <Input
              id="goal-targetDate"
              type="date"
              value={formData.targetDate}
              onChange={(e) => setFormData({ ...formData, targetDate: e.target.value })}
              min={new Date().toISOString().split("T")[0]}
            />
          </div>
          <AccountSelector
            value={formData.accountId}
            onChange={(value) => setFormData({ ...formData, accountId: value || '' })}
            accounts={accounts}
            label="Conta destino"
            allowNone={false}
            placeholder="Selecione uma conta"
          />
        </div>
      </div>
    </FormModalWrapper>
  );
}
