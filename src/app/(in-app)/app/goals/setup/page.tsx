"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  ArrowRight,
  Loader2,
  Target,
  Plus,
  Pencil,
  Trash2,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Budget {
  id: string;
  name: string;
}

interface Goal {
  id: string;
  name: string;
  icon: string;
  color: string;
  targetAmount: number;
  currentAmount: number;
  targetDate: string;
  progress: number;
  monthlyTarget: number;
  monthsRemaining: number;
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
  "#8b5cf6", "#ec4899", "#f43f5e", "#ef4444",
  "#f97316", "#eab308", "#22c55e", "#14b8a6",
  "#06b6d4", "#3b82f6", "#6366f1", "#a855f7",
];

const SUGGESTED_GOALS = [
  { name: "Reserva de Emergência", icon: "🛡️", color: "#22c55e", months: 6, description: "3-6 meses de gastos" },
  { name: "Viagem de Férias", icon: "✈️", color: "#06b6d4", months: 12, description: "Para sua próxima aventura" },
  { name: "Entrada do Imóvel", icon: "🏠", color: "#8b5cf6", months: 36, description: "20% do valor do imóvel" },
  { name: "Trocar de Carro", icon: "🚗", color: "#f97316", months: 24, description: "Seu próximo veículo" },
  { name: "Casamento", icon: "💍", color: "#ec4899", months: 18, description: "O grande dia" },
  { name: "Educação", icon: "🎓", color: "#3b82f6", months: 12, description: "Investir em conhecimento" },
];

function formatCurrency(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export default function GoalsSetupPage() {
  const router = useRouter();
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<GoalFormData>({
    name: "",
    icon: "🎯",
    color: "#8b5cf6",
    targetAmount: 0,
    targetDate: "",
  });

  const fetchData = useCallback(async () => {
    try {
      const [budgetsRes, goalsRes] = await Promise.all([
        fetch("/api/app/budgets"),
        fetch("/api/app/goals"),
      ]);

      if (budgetsRes.ok) {
        const data = await budgetsRes.json();
        setBudgets(data.budgets || []);
      }

      if (goalsRes.ok) {
        const data = await goalsRes.json();
        setGoals(data.goals?.filter((g: Goal & { isCompleted?: boolean; isArchived?: boolean }) =>
          !g.isCompleted && !g.isArchived
        ) || []);
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

  const openCreateForm = (suggestion?: typeof SUGGESTED_GOALS[0]) => {
    const futureDate = new Date();
    futureDate.setMonth(futureDate.getMonth() + (suggestion?.months || 12));

    setFormData({
      name: suggestion?.name || "",
      icon: suggestion?.icon || "🎯",
      color: suggestion?.color || "#8b5cf6",
      targetAmount: 0,
      targetDate: futureDate.toISOString().split("T")[0],
    });
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

    if (budgets.length === 0) {
      toast.error("Nenhum orçamento encontrado");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        ...formData,
        targetAmount: Math.round(formData.targetAmount * 100),
        budgetId: budgets[0].id,
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
      fetchData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao salvar meta");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (goal: Goal) => {
    try {
      const response = await fetch(`/api/app/goals/${goal.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Erro ao remover meta");
      }

      toast.success("Meta removida!");
      fetchData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao remover");
    }
  };

  const handleContinue = () => {
    router.push("/app/budget");
  };

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-4 max-w-3xl mx-auto">
      {/* Header */}
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-purple-100 dark:bg-purple-900/30 mb-4">
          <Target className="h-8 w-8 text-purple-600" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight">Defina suas Metas</h1>
        <p className="text-muted-foreground mt-2">
          Configure objetivos financeiros para guiar seu planejamento
        </p>
      </div>

      {/* Existing Goals */}
      {goals.length > 0 && (
        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              Suas Metas ({goals.length})
            </h3>
            <Button variant="outline" size="sm" onClick={() => openCreateForm()}>
              <Plus className="mr-2 h-4 w-4" />
              Adicionar
            </Button>
          </div>

          <div className="space-y-3">
            {goals.map((goal) => (
              <div
                key={goal.id}
                className="flex items-center gap-3 p-3 rounded-lg border bg-background"
                style={{ borderLeftColor: goal.color, borderLeftWidth: "4px" }}
              >
                <span className="text-2xl">{goal.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium">{goal.name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Progress value={goal.progress} className="h-1.5 flex-1" />
                    <span className="text-xs text-muted-foreground">
                      {formatCurrency(goal.currentAmount)} / {formatCurrency(goal.targetAmount)}
                    </span>
                  </div>
                  {goal.monthlyTarget > 0 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatCurrency(goal.monthlyTarget)}/mês por {goal.monthsRemaining} meses
                    </p>
                  )}
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => openEditForm(goal)}
                    className="p-1.5 rounded hover:bg-muted transition-colors"
                    title="Editar"
                  >
                    <Pencil className="h-4 w-4 text-muted-foreground" />
                  </button>
                  <button
                    onClick={() => handleDelete(goal)}
                    className="p-1.5 rounded hover:bg-muted transition-colors"
                    title="Remover"
                  >
                    <Trash2 className="h-4 w-4 text-muted-foreground" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Suggested Goals */}
      <div className="rounded-lg border bg-card p-4">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="h-4 w-4 text-amber-500" />
          <h3 className="font-semibold">Sugestões de Metas</h3>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {SUGGESTED_GOALS.map((suggestion) => {
            const alreadyExists = goals.some(
              (g) => g.name.toLowerCase() === suggestion.name.toLowerCase()
            );

            return (
              <button
                key={suggestion.name}
                onClick={() => !alreadyExists && openCreateForm(suggestion)}
                disabled={alreadyExists}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg border text-left transition-all",
                  alreadyExists
                    ? "opacity-50 cursor-not-allowed"
                    : "hover:border-primary hover:bg-primary/5"
                )}
              >
                <span
                  className="text-2xl p-2 rounded-lg"
                  style={{ backgroundColor: `${suggestion.color}20` }}
                >
                  {suggestion.icon}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium">{suggestion.name}</p>
                  <p className="text-xs text-muted-foreground">{suggestion.description}</p>
                </div>
                {alreadyExists ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
                ) : (
                  <Plus className="h-5 w-5 text-muted-foreground shrink-0" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Info Box */}
      <div className="rounded-lg border border-purple-200 bg-purple-50 dark:bg-purple-950/20 dark:border-purple-800 p-4">
        <div className="flex gap-3">
          <div className="shrink-0">
            <Target className="h-5 w-5 text-purple-600" />
          </div>
          <div className="text-sm">
            <p className="font-medium text-purple-900 dark:text-purple-100">
              Dica: Comece com uma Reserva de Emergência
            </p>
            <p className="text-purple-700 dark:text-purple-300 mt-1">
              Ter de 3 a 6 meses de gastos guardados oferece segurança para imprevistos
              e liberdade para tomar melhores decisões financeiras.
            </p>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between border-t pt-4">
        <Button
          variant="outline"
          onClick={() => router.push("/app/budget/setup")}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>

        <Button onClick={handleContinue}>
          {goals.length > 0 ? "Continuar para o Orçamento" : "Pular por Agora"}
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>

      {/* Create/Edit Dialog */}
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
              onClick={() => setIsFormOpen(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button
              className="w-1/4"
              onClick={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingGoal ? "Salvar" : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
