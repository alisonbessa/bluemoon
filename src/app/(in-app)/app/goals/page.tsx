"use client";

import { useState } from "react";
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
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { CurrencyInput } from "@/components/ui/currency-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Loader2,
  Target,
  Pencil,
  Calendar,
  TrendingUp,
  Trophy,
  Archive,
} from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/formatters";
import confetti from "canvas-confetti";
import { GoalFormModal } from "@/components/goals/goal-form-modal";
import { useGoals, useBudgets, useAccounts } from "@/hooks";
import type { Goal } from "@/types";

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
  // SWR hooks for cached data fetching
  const { goals, isLoading: goalsLoading, mutate: mutateGoals } = useGoals();
  const { budgets, isLoading: budgetsLoading } = useBudgets();
  const { accounts, isLoading: accountsLoading, mutate: mutateAccounts } = useAccounts();

  const isLoading = goalsLoading || budgetsLoading || accountsLoading;

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [deletingGoal, setDeletingGoal] = useState<Goal | null>(null);
  const [contributeGoal, setContributeGoal] = useState<Goal | null>(null);
  const [contributeAmountCents, setContributeAmountCents] = useState(0);
  const [contributeFromAccountId, setContributeFromAccountId] = useState("");

  const openCreateForm = () => {
    setEditingGoal(null);
    setIsFormOpen(true);
  };

  const openEditForm = (goal: Goal) => {
    setEditingGoal(goal);
    setIsFormOpen(true);
  };

  const handleFormSuccess = () => {
    setIsFormOpen(false);
    setEditingGoal(null);
    mutateGoals();
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
      mutateGoals();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao arquivar meta");
    }
  };

  const handleContribute = async () => {
    if (!contributeGoal) return;

    if (contributeAmountCents <= 0) {
      toast.error("Digite um valor válido");
      return;
    }

    if (!contributeFromAccountId) {
      toast.error("Selecione a conta de origem");
      return;
    }

    try {
      const now = new Date();
      const response = await fetch(`/api/app/goals/${contributeGoal.id}/contribute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: contributeAmountCents,
          year: now.getFullYear(),
          month: now.getMonth() + 1,
          fromAccountId: contributeFromAccountId,
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
      setContributeAmountCents(0);
      setContributeFromAccountId("");
      mutateGoals();
      mutateAccounts(); // Account balance changed
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
                  setContributeAmountCents(0);
                  setContributeFromAccountId("");
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

      {/* Create/Edit Goal Modal - using unified GoalFormModal */}
      {budgets[0]?.id && (
        <GoalFormModal
          open={isFormOpen}
          onOpenChange={(open) => {
            setIsFormOpen(open);
            if (!open) setEditingGoal(null);
          }}
          budgetId={budgets[0].id}
          editingGoal={editingGoal}
          onSuccess={handleFormSuccess}
        />
      )}

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
              <Label htmlFor="contributeFromAccount">Conta de origem</Label>
              <Select
                value={contributeFromAccountId}
                onValueChange={setContributeFromAccountId}
              >
                <SelectTrigger id="contributeFromAccount">
                  <SelectValue placeholder="Selecione a conta" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      <span className="flex items-center gap-2">
                        <span>{account.icon || "💳"}</span>
                        <span>{account.name}</span>
                        <span className="text-muted-foreground">
                          ({formatCurrency(account.balance)})
                        </span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                O valor será transferido desta conta para a meta
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="contributeAmount">Valor da contribuição</Label>
              <CurrencyInput
                id="contributeAmount"
                value={contributeAmountCents}
                onChange={(valueInCents) => setContributeAmountCents(valueInCents)}
                autoFocus
                placeholder="0,00"
              />
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
                setContributeAmountCents(0);
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
