"use client";

import { useEffect, useCallback, useState } from "react";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Plus,
  Loader2,
  Target,
  Pencil,
  Trash2,
  Calendar,
  TrendingUp,
  Trophy,
  Archive,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import confetti from "canvas-confetti";

interface Goal {
  id: string;
  budgetId: string;
  name: string;
  icon: string;
  color: string;
  targetAmount: number;
  currentAmount: number;
  targetDate: string;
  isCompleted: boolean;
  completedAt: string | null;
  isArchived: boolean;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
  // Calculated metrics
  progress: number;
  monthsRemaining: number;
  monthlyTarget: number;
  remaining: number;
}

interface GoalFormData {
  name: string;
  icon: string;
  color: string;
  targetAmount: number;
  targetDate: string;
}

const EMOJI_OPTIONS = ["🎯", "✈️", "🏠", "🚗", "💍", "🎓", "💻", "📱", "🏖️", "💰", "🎁", "🛒"];
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

function formatCurrency(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("pt-BR", { month: "short", year: "numeric" });
}

function formatFullDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export default function GoalsPage() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [budgets, setBudgets] = useState<{ id: string; name: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [deletingGoal, setDeletingGoal] = useState<Goal | null>(null);
  const [contributeGoal, setContributeGoal] = useState<Goal | null>(null);
  const [contributeAmount, setContributeAmount] = useState("");

  const [formData, setFormData] = useState<GoalFormData>({
    name: "",
    icon: "🎯",
    color: "#8b5cf6",
    targetAmount: 0,
    targetDate: "",
  });

  const fetchData = useCallback(async () => {
    try {
      const [goalsRes, budgetsRes] = await Promise.all([
        fetch("/api/app/goals"),
        fetch("/api/app/budgets"),
      ]);

      if (goalsRes.ok) {
        const data = await goalsRes.json();
        setGoals(data.goals || []);
      }

      if (budgetsRes.ok) {
        const data = await budgetsRes.json();
        setBudgets(data.budgets || []);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Erro ao carregar dados");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const resetForm = () => {
    setFormData({
      name: "",
      icon: "🎯",
      color: "#8b5cf6",
      targetAmount: 0,
      targetDate: "",
    });
  };

  const openCreateForm = () => {
    resetForm();
    setEditingGoal(null);
    setIsFormOpen(true);
  };

  const openEditForm = (goal: Goal) => {
    setFormData({
      name: goal.name,
      icon: goal.icon,
      color: goal.color,
      targetAmount: goal.targetAmount / 100,
      targetDate: goal.targetDate.split("T")[0],
    });
    setEditingGoal(goal);
    setIsFormOpen(true);
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

    try {
      const payload = {
        ...formData,
        targetAmount: Math.round(formData.targetAmount * 100),
        budgetId: budgets[0]?.id,
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
      setIsFormOpen(false);
      setEditingGoal(null);
      resetForm();
      fetchData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao salvar meta");
    }
  };

  const handleDelete = async () => {
    if (!deletingGoal) return;

    try {
      const response = await fetch(`/api/app/goals/${deletingGoal.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Erro ao arquivar meta");
      }

      toast.success("Meta arquivada!");
      setDeletingGoal(null);
      fetchData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao arquivar meta");
    }
  };

  const handleContribute = async () => {
    if (!contributeGoal) return;

    const amount = parseFloat(contributeAmount.replace(",", "."));
    if (isNaN(amount) || amount <= 0) {
      toast.error("Digite um valor válido");
      return;
    }

    try {
      const now = new Date();
      const response = await fetch(`/api/app/goals/${contributeGoal.id}/contribute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: Math.round(amount * 100),
          year: now.getFullYear(),
          month: now.getMonth() + 1,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Erro ao contribuir");
      }

      const data = await response.json();

      if (data.justCompleted) {
        // Celebration!
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
        });
        toast.success("🎉 Parabéns! Meta atingida!");
      } else {
        toast.success("Contribuição registrada!");
      }

      setContributeGoal(null);
      setContributeAmount("");
      fetchData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao contribuir");
    }
  };

  const activeGoals = goals.filter((g) => !g.isArchived && !g.isCompleted);
  const completedGoals = goals.filter((g) => g.isCompleted && !g.isArchived);

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Target className="h-6 w-6" />
            Metas
          </h1>
          <p className="text-sm text-muted-foreground">
            Defina objetivos financeiros e acompanhe seu progresso
          </p>
        </div>
        <Button onClick={openCreateForm} size="sm" data-tutorial="add-goal-button">
          <Plus className="mr-2 h-4 w-4" />
          Nova Meta
        </Button>
      </div>

      {/* Active Goals */}
      {activeGoals.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {activeGoals.map((goal) => (
            <div
              key={goal.id}
              className="rounded-lg border bg-card p-4 hover:shadow-md transition-shadow"
              style={{ borderLeftColor: goal.color, borderLeftWidth: "4px" }}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{goal.icon}</span>
                  <div>
                    <h3 className="font-semibold">{goal.name}</h3>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      <span>até {formatDate(goal.targetDate)}</span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => openEditForm(goal)}
                    className="p-1 rounded hover:bg-muted transition-colors"
                    title="Editar meta"
                  >
                    <Pencil className="h-4 w-4 text-muted-foreground" />
                  </button>
                  <button
                    onClick={() => setDeletingGoal(goal)}
                    className="p-1 rounded hover:bg-muted transition-colors"
                    title="Arquivar meta"
                  >
                    <Archive className="h-4 w-4 text-muted-foreground" />
                  </button>
                </div>
              </div>

              {/* Progress */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Progresso</span>
                  <span className="font-medium">{goal.progress}%</span>
                </div>
                <Progress
                  value={goal.progress}
                  className="h-2"
                  style={
                    {
                      "--progress-background": goal.color,
                    } as React.CSSProperties
                  }
                />
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    {formatCurrency(goal.currentAmount)} de {formatCurrency(goal.targetAmount)}
                  </span>
                </div>
              </div>

              {/* Monthly suggestion */}
              {goal.monthsRemaining > 0 && goal.remaining > 0 && (
                <div className="mt-3 p-2 bg-muted/50 rounded-md">
                  <div className="flex items-center gap-2 text-sm">
                    <TrendingUp className="h-4 w-4 text-primary" />
                    <span>
                      Guardar{" "}
                      <span className="font-semibold text-primary">
                        {formatCurrency(goal.monthlyTarget)}
                      </span>
                      /mês
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {goal.monthsRemaining} {goal.monthsRemaining === 1 ? "mês restante" : "meses restantes"}
                  </p>
                </div>
              )}

              {/* Contribute button */}
              <Button
                variant="outline"
                size="sm"
                className="w-full mt-3"
                onClick={() => {
                  setContributeGoal(goal);
                  setContributeAmount("");
                }}
              >
                <Plus className="mr-2 h-4 w-4" />
                Contribuir
              </Button>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed bg-card p-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <Target className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="font-semibold">Nenhuma meta ativa</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Crie metas financeiras e acompanhe seu progresso
          </p>
          <Button className="mt-4" onClick={openCreateForm}>
            <Plus className="mr-2 h-4 w-4" />
            Criar Primeira Meta
          </Button>
        </div>
      )}

      {/* Completed Goals */}
      {completedGoals.length > 0 && (
        <div className="mt-6">
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-500" />
            Metas Concluídas
          </h2>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {completedGoals.map((goal) => (
              <div
                key={goal.id}
                className="rounded-lg border bg-card/50 p-3 opacity-75"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{goal.icon}</span>
                    <div>
                      <h3 className="font-medium text-sm">{goal.name}</h3>
                      <p className="text-xs text-muted-foreground">
                        {formatCurrency(goal.targetAmount)} • Concluída em{" "}
                        {goal.completedAt
                          ? formatFullDate(goal.completedAt)
                          : formatFullDate(goal.updatedAt)}
                      </p>
                    </div>
                  </div>
                  <Trophy className="h-5 w-5 text-yellow-500" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Create/Edit Goal Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
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
              <Label htmlFor="name">Nome da meta</Label>
              <Input
                id="name"
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
              <Label htmlFor="targetAmount">Valor alvo</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  R$
                </span>
                <Input
                  id="targetAmount"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0,00"
                  className="pl-10"
                  value={formData.targetAmount || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      targetAmount: parseFloat(e.target.value) || 0,
                    })
                  }
                />
              </div>
            </div>

            {/* Target Date */}
            <div className="space-y-2">
              <Label htmlFor="targetDate">Data limite</Label>
              <Input
                id="targetDate"
                type="date"
                value={formData.targetDate}
                onChange={(e) => setFormData({ ...formData, targetDate: e.target.value })}
                min={new Date().toISOString().split("T")[0]}
              />
            </div>
          </div>

          <DialogFooter className="flex justify-end gap-2">
            <Button
              variant="outline"
              className="w-1/4"
              onClick={() => {
                setIsFormOpen(false);
                setEditingGoal(null);
                resetForm();
              }}
            >
              Cancelar
            </Button>
            <Button className="w-1/4" onClick={handleSubmit}>
              {editingGoal ? "Salvar" : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Contribute Dialog */}
      <Dialog open={!!contributeGoal} onOpenChange={(open) => !open && setContributeGoal(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="text-2xl">{contributeGoal?.icon}</span>
              Contribuir para {contributeGoal?.name}
            </DialogTitle>
            <DialogDescription>
              Progresso atual: {formatCurrency(contributeGoal?.currentAmount || 0)} de{" "}
              {formatCurrency(contributeGoal?.targetAmount || 0)}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="contributeAmount">Valor da contribuição</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  R$
                </span>
                <Input
                  id="contributeAmount"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0,00"
                  className="pl-10"
                  value={contributeAmount}
                  onChange={(e) => setContributeAmount(e.target.value)}
                  autoFocus
                />
              </div>
              {contributeGoal && contributeGoal.monthlyTarget > 0 && (
                <p className="text-xs text-muted-foreground">
                  Sugestão mensal: {formatCurrency(contributeGoal.monthlyTarget)}
                </p>
              )}
            </div>
          </div>

          <DialogFooter className="flex justify-end gap-2">
            <Button
              variant="outline"
              className="w-1/4"
              onClick={() => {
                setContributeGoal(null);
                setContributeAmount("");
              }}
            >
              Cancelar
            </Button>
            <Button className="w-1/4" onClick={handleContribute}>
              Contribuir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingGoal} onOpenChange={(open) => !open && setDeletingGoal(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Arquivar meta?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja arquivar a meta &quot;{deletingGoal?.name}&quot;? A meta será
              removida da sua lista, mas você pode restaurá-la depois.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Arquivar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
