"use client";

import { useState } from "react";
import { Button } from "@/shared/ui/button";
import { Progress } from "@/shared/ui/progress";
import {
  Plus,
  Target,
  Pencil,
  Calendar,
  TrendingUp,
  Trophy,
  Archive,
} from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/shared/lib/formatters";
import confetti from "canvas-confetti";
import { GoalFormModal, ContributeModal } from "@/features/goals";
import { useGoals, useBudgets, useAccounts } from "@/shared/hooks";
import type { Goal } from "@/types";
import {
  PageHeader,
  PageContent,
  EmptyState,
  DeleteConfirmDialog,
  LoadingState,
  ResponsiveButton,
} from "@/shared/molecules";
import { useTutorial } from "@/shared/tutorial/tutorial-provider";

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
  const { notifyActionCompleted, isActive: isTutorialActive } = useTutorial();

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
    // Notify tutorial that user created a goal
    if (isTutorialActive) {
      notifyActionCompleted("hasGoals");
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
    return <LoadingState fullHeight />;
  }

  return (
    <PageContent>
      {/* Header */}
      <PageHeader
        title="Metas"
        description="Defina objetivos financeiros e acompanhe seu progresso"
        actions={
          <ResponsiveButton
            onClick={openCreateForm}
            size="sm"
            icon={<Plus />}
            data-tutorial="add-goal-button"
          >
            Nova Meta
          </ResponsiveButton>
        }
      />

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
        <EmptyState
          icon={<Target className="h-6 w-6 text-muted-foreground" />}
          title="Nenhuma meta ativa"
          description="Crie metas financeiras e acompanhe seu progresso"
          action={{
            label: "Criar Primeira Meta",
            onClick: openCreateForm,
            icon: <Plus className="mr-2 h-4 w-4" />,
          }}
        />
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
      <ContributeModal
        goal={contributeGoal}
        amountCents={contributeAmountCents}
        onAmountChange={setContributeAmountCents}
        accountId={contributeFromAccountId}
        onAccountChange={setContributeFromAccountId}
        accounts={accounts}
        onClose={() => {
          setContributeGoal(null);
          setContributeAmountCents(0);
          setContributeFromAccountId("");
        }}
        onSubmit={handleContribute}
      />

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmDialog
        open={!!deletingGoal}
        onOpenChange={(open) => !open && setDeletingGoal(null)}
        onConfirm={handleDelete}
        title="Arquivar meta?"
        description={`Tem certeza que deseja arquivar a meta "${deletingGoal?.name}"? A meta será removida da sua lista, mas você pode restaurá-la depois.`}
        confirmLabel="Arquivar"
      />
    </PageContent>
  );
}
