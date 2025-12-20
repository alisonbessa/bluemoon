"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  ArrowLeft,
  ArrowRight,
  Loader2,
  PiggyBank,
  Wallet,
  Target,
  CheckCircle2,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Budget {
  id: string;
  name: string;
}

interface Group {
  id: string;
  code: string;
  name: string;
  icon?: string | null;
}

interface Category {
  id: string;
  name: string;
  icon?: string | null;
  groupId: string;
}

interface IncomeSource {
  id: string;
  name: string;
  type: string;
  amount: number;
  frequency: string;
}

interface Goal {
  id: string;
  name: string;
  icon: string;
  targetAmount: number;
  currentAmount: number;
  isCompleted?: boolean;
}

function formatCurrency(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export default function BudgetSetupPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [incomeSources, setIncomeSources] = useState<IncomeSource[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);

  const fetchData = useCallback(async () => {
    try {
      const [budgetsRes, categoriesRes, incomeRes, goalsRes] = await Promise.all([
        fetch("/api/app/budgets"),
        fetch("/api/app/categories"),
        fetch("/api/app/income-sources"),
        fetch("/api/app/goals"),
      ]);

      if (budgetsRes.ok) {
        const data = await budgetsRes.json();
        setBudgets(data.budgets || []);
      }

      if (categoriesRes.ok) {
        const data = await categoriesRes.json();
        setGroups(data.groups || []);
        setCategories(data.flatCategories || []);
      }

      if (incomeRes.ok) {
        const data = await incomeRes.json();
        setIncomeSources(data.incomeSources || []);
      }

      if (goalsRes.ok) {
        const data = await goalsRes.json();
        setGoals(data.goals?.filter((g: Goal) => !g.isCompleted) || []);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Calculate totals
  const totalIncome = incomeSources.reduce((sum, source) => sum + source.amount, 0);
  const categoriesByGroup = groups.map((group) => ({
    group,
    categories: categories.filter((c) => c.groupId === group.id),
  }));

  // Check setup completion
  const hasCategories = categories.length > 0;
  const hasIncome = incomeSources.length > 0;

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (budgets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <PiggyBank className="h-16 w-16 text-muted-foreground" />
        <h2 className="text-xl font-semibold">Nenhum orçamento encontrado</h2>
        <p className="text-muted-foreground">Complete o onboarding para começar</p>
        <Button onClick={() => router.push("/app")}>
          Ir para o Dashboard
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-4 max-w-3xl mx-auto">
      {/* Header */}
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
          <PiggyBank className="h-8 w-8 text-primary" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight">Pronto para planejar!</h1>
        <p className="text-muted-foreground mt-2">
          Revise o que foi configurado e comece a planejar seu orçamento
        </p>
      </div>

      {/* Setup Status Cards */}
      <div className="grid gap-4 sm:grid-cols-2">
        {/* Categories Card */}
        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className={cn(
                "p-2 rounded-full",
                hasCategories ? "bg-green-100 dark:bg-green-900/30" : "bg-muted"
              )}>
                {hasCategories ? (
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                ) : (
                  <Wallet className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
              <h3 className="font-semibold">Categorias</h3>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push("/app/categories/setup")}
            >
              Editar
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>

          {hasCategories ? (
            <div className="space-y-2">
              {categoriesByGroup.slice(0, 4).map(({ group, categories: cats }) => (
                cats.length > 0 && (
                  <div key={group.id} className="flex items-center gap-2 text-sm">
                    <span>{group.icon || "📁"}</span>
                    <span className="text-muted-foreground">{group.name}:</span>
                    <span className="font-medium">{cats.length} categorias</span>
                  </div>
                )
              ))}
              <p className="text-xs text-muted-foreground mt-2">
                Total: {categories.length} categorias em {groups.length} grupos
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Nenhuma categoria configurada ainda
            </p>
          )}
        </div>

        {/* Income Card */}
        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className={cn(
                "p-2 rounded-full",
                hasIncome ? "bg-green-100 dark:bg-green-900/30" : "bg-muted"
              )}>
                {hasIncome ? (
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                ) : (
                  <Wallet className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
              <h3 className="font-semibold">Receitas</h3>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push("/app/income/setup")}
            >
              Editar
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>

          {hasIncome ? (
            <div className="space-y-2">
              {incomeSources.slice(0, 3).map((source) => (
                <div key={source.id} className="flex items-center justify-between text-sm">
                  <span>{source.name}</span>
                  <span className="font-medium text-green-600">
                    {formatCurrency(source.amount)}
                  </span>
                </div>
              ))}
              {incomeSources.length > 3 && (
                <p className="text-xs text-muted-foreground">
                  +{incomeSources.length - 3} fontes de renda
                </p>
              )}
              <div className="pt-2 border-t mt-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">Total Mensal</span>
                  <span className="font-bold text-green-600">
                    {formatCurrency(totalIncome)}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Nenhuma fonte de renda configurada ainda
            </p>
          )}
        </div>
      </div>

      {/* Goals Card (if any) */}
      {goals.length > 0 && (
        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-full bg-purple-100 dark:bg-purple-900/30">
                <Target className="h-4 w-4 text-purple-600" />
              </div>
              <h3 className="font-semibold">Metas</h3>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push("/app/goals")}
            >
              Ver todas
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {goals.slice(0, 4).map((goal) => {
              const progress = goal.targetAmount > 0
                ? (goal.currentAmount / goal.targetAmount) * 100
                : 0;
              return (
                <div key={goal.id} className="flex items-center gap-3">
                  <span className="text-xl">{goal.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{goal.name}</p>
                    <Progress value={progress} className="h-1.5 mt-1" />
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {Math.round(progress)}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Info Box */}
      <div className="rounded-lg border border-blue-200 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-800 p-4">
        <div className="flex gap-3">
          <div className="shrink-0">
            <PiggyBank className="h-5 w-5 text-blue-600" />
          </div>
          <div className="text-sm">
            <p className="font-medium text-blue-900 dark:text-blue-100">
              Como funciona o planejamento?
            </p>
            <p className="text-blue-700 dark:text-blue-300 mt-1">
              No orçamento, você distribui sua renda mensal entre as categorias.
              Defina quanto quer gastar em cada categoria e acompanhe seus gastos ao longo do mês.
            </p>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between border-t pt-4">
        <Button
          variant="outline"
          onClick={() => router.push("/app/income/setup")}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar para Receitas
        </Button>

        <Button
          onClick={() => router.push("/app/goals/setup")}
          disabled={!hasCategories || !hasIncome}
        >
          Continuar
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>

      {/* Warning if not ready */}
      {(!hasCategories || !hasIncome) && (
        <p className="text-center text-sm text-amber-600">
          Configure pelo menos uma categoria e uma fonte de renda para continuar
        </p>
      )}
    </div>
  );
}
