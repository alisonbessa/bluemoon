"use client";

import React, { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  PlusIcon,
  WalletIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  ArrowRightIcon,
  LayoutGridIcon,
  ReceiptIcon,
  SettingsIcon,
  TargetIcon,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { MonthSelector } from "@/components/ui/month-selector";
import { DashboardCharts, CreditCardSpending, ScheduledTransactionsList } from "@/components/dashboard";
import Link from "next/link";
import useUser from "@/lib/users/useUser";
import { formatCurrency } from "@/lib/formatters";

interface Commitment {
  id: string;
  name: string;
  icon: string | null;
  targetDate: string;
  allocated: number;
  group: {
    id: string;
    name: string;
    code: string;
  };
}

interface Budget {
  id: string;
  name: string;
}

interface MonthSummary {
  income: { planned: number; received: number };
  expenses: { allocated: number; spent: number };
  available: number;
}

interface Goal {
  id: string;
  name: string;
  icon: string;
  color: string;
  targetAmount: number;
  currentAmount: number;
  progress: number;
  monthlyTarget: number;
  monthsRemaining: number;
  isCompleted: boolean;
}

interface DailyChartData {
  day: number;
  date: string;
  income: number;
  expense: number;
  balance: number;
  pendingIncome?: number;
  pendingExpense?: number;
  pendingBalance?: number;
}

interface MonthlyChartData {
  month: string;
  year: number;
  label: string;
  income: number;
  expense: number;
}

interface CreditCard {
  id: string;
  name: string;
  icon: string | null;
  creditLimit: number;
  spent: number;
  available: number;
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
  });
}

function getDaysUntil(dateString: string): number {
  const target = new Date(dateString);
  const now = new Date();
  const diff = target.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-96" />
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <Skeleton className="h-64" />
        <Skeleton className="h-64" />
      </div>
    </div>
  );
}

function AppHomepage() {
  const { user, isLoading, error } = useUser();
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [commitments, setCommitments] = useState<Commitment[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [commitmentsLoading, setCommitmentsLoading] = useState(true);
  const [goalsLoading, setGoalsLoading] = useState(true);
  const [monthSummary, setMonthSummary] = useState<MonthSummary | null>(null);
  const [dailyChartData, setDailyChartData] = useState<DailyChartData[]>([]);
  const [monthlyChartData, setMonthlyChartData] = useState<MonthlyChartData[]>([]);
  const [creditCards, setCreditCards] = useState<CreditCard[]>([]);
  const [chartsLoading, setChartsLoading] = useState(true);
  const [scheduledRefreshKey, setScheduledRefreshKey] = useState(0);

  // Month navigation
  const today = new Date();
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth() + 1);

  const hasCompletedOnboarding = !!user?.onboardingCompletedAt;

  const handleMonthChange = (year: number, month: number) => {
    setCurrentYear(year);
    setCurrentMonth(month);
  };

  const fetchData = useCallback(async () => {
    try {
      // Fetch budgets first
      const budgetsRes = await fetch("/api/app/budgets");
      if (budgetsRes.ok) {
        const data = await budgetsRes.json();
        setBudgets(data.budgets || []);

        // If we have a budget, fetch allocations and commitments
        if (data.budgets?.length > 0) {
          const budgetId = data.budgets[0].id;

          // Fetch allocations for the month (includes income data)
          const allocationsRes = await fetch(
            `/api/app/allocations?budgetId=${budgetId}&year=${currentYear}&month=${currentMonth}`
          );
          if (allocationsRes.ok) {
            const allocData = await allocationsRes.json();

            // Calculate summary from allocations
            const income = allocData.income?.totals || { planned: 0, received: 0 };
            const expenses = allocData.totals || { allocated: 0, spent: 0 };
            const available = income.planned - expenses.allocated;

            setMonthSummary({
              income,
              expenses,
              available,
            });
          }

          // Fetch commitments (only for current/future months)
          if (currentYear > today.getFullYear() ||
              (currentYear === today.getFullYear() && currentMonth >= today.getMonth() + 1)) {
            const commitmentsRes = await fetch(
              `/api/app/commitments?budgetId=${budgetId}&days=30&year=${currentYear}&month=${currentMonth}`
            );
            if (commitmentsRes.ok) {
              const commitmentsData = await commitmentsRes.json();
              setCommitments(commitmentsData.commitments || []);
            }
          } else {
            setCommitments([]);
          }

          // Fetch goals
          const goalsRes = await fetch(`/api/app/goals?budgetId=${budgetId}`);
          if (goalsRes.ok) {
            const goalsData = await goalsRes.json();
            setGoals(goalsData.goals || []);
          }

          // Fetch dashboard stats (charts, credit cards)
          const statsRes = await fetch(
            `/api/app/dashboard/stats?budgetId=${budgetId}&year=${currentYear}&month=${currentMonth}`
          );
          if (statsRes.ok) {
            const statsData = await statsRes.json();
            setDailyChartData(statsData.dailyChartData || []);
            setMonthlyChartData(statsData.monthlyComparison || []);
            setCreditCards(statsData.creditCards || []);
          }
        }
      }
    } catch (err) {
      console.error("Error fetching dashboard data:", err);
    } finally {
      setCommitmentsLoading(false);
      setGoalsLoading(false);
      setChartsLoading(false);
    }
  }, [currentYear, currentMonth]);

  useEffect(() => {
    if (user) {
      setCommitmentsLoading(true);
      setGoalsLoading(true);
      setChartsLoading(true);
      fetchData();
    } else {
      setCommitmentsLoading(false);
      setGoalsLoading(false);
      setChartsLoading(false);
    }
  }, [user, fetchData]);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6 p-6">
        <DashboardSkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col gap-6 p-6">
        <Alert variant="destructive">
          <AlertDescription>
            Erro ao carregar dados: {error.message}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const firstName = user?.name?.split(" ")[0] || "Usuário";

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header with Month Navigation */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-bold tracking-tight">
            Olá, {firstName}!
          </h1>
          <p className="text-muted-foreground">
            Visão geral das suas finanças
          </p>
        </div>

        <MonthSelector
          year={currentYear}
          month={currentMonth}
          onChange={handleMonthChange}
        />
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Saldo do Mês
            </CardTitle>
            <WalletIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${((monthSummary?.income.received ?? 0) - (monthSummary?.expenses.spent ?? 0)) >= 0 ? "text-green-600" : "text-red-600"}`}>
              {formatCurrency((monthSummary?.income.received ?? 0) - (monthSummary?.expenses.spent ?? 0))}
            </div>
            <p className="text-xs text-muted-foreground">
              Planejado {formatCurrency(
                (monthSummary?.income.planned ?? 0) - (monthSummary?.expenses.allocated ?? 0)
              )}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Receitas do Mês
            </CardTitle>
            <TrendingUpIcon className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(monthSummary?.income.received ?? 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              {monthSummary?.income.received === monthSummary?.income.planned
                ? "Meta atingida!"
                : `Faltam ${formatCurrency(Math.max(0, (monthSummary?.income.planned ?? 0) - (monthSummary?.income.received ?? 0)))}`}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Despesas do Mês
            </CardTitle>
            <TrendingDownIcon className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(monthSummary?.expenses.spent ?? 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              {(monthSummary?.expenses.spent ?? 0) <= (monthSummary?.expenses.allocated ?? 0)
                ? `Restam ${formatCurrency((monthSummary?.expenses.allocated ?? 0) - (monthSummary?.expenses.spent ?? 0))}`
                : `Excedido em ${formatCurrency((monthSummary?.expenses.spent ?? 0) - (monthSummary?.expenses.allocated ?? 0))}`}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Goals Card */}
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TargetIcon className="h-5 w-5" />
              Metas
            </CardTitle>
            <CardDescription>
              Acompanhe o progresso das suas metas financeiras
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col flex-1">
            {goalsLoading ? (
              <div className="flex flex-col gap-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-11 w-full" />
                ))}
              </div>
            ) : goals.filter((g) => !g.isCompleted).length > 0 ? (
              <div className="flex flex-col flex-1">
                <div className="flex-1 space-y-0">
                  {goals
                    .filter((g) => !g.isCompleted)
                    .slice(0, 5)
                    .map((goal) => (
                      <div key={goal.id} className="py-3 space-y-1.5">
                        <div className="flex justify-between text-sm">
                          <span className="flex items-center gap-1.5">
                            <span>{goal.icon}</span>
                            <span className="font-medium">{goal.name}</span>
                          </span>
                          <span className="text-muted-foreground">{goal.progress}%</span>
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
                      </div>
                    ))}
                </div>
                <div className="mt-auto pt-3">
                  <Button asChild variant="ghost" size="sm" className="w-full">
                    <Link href="/app/goals">
                      Ver {goals.filter((g) => !g.isCompleted).length > 5 ? `todas as ${goals.filter((g) => !g.isCompleted).length} metas` : "mais"}
                      <ArrowRightIcon className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-4 text-center flex-1">
                <TargetIcon className="h-10 w-10 text-muted-foreground/50 mb-2" />
                <p className="text-sm text-muted-foreground">
                  Nenhuma meta criada ainda
                </p>
                <div className="mt-auto pt-3">
                  <Button asChild variant="outline" size="sm">
                    <Link href="/app/goals">
                      <PlusIcon className="mr-2 h-4 w-4" />
                      Criar primeira meta
                    </Link>
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Scheduled Transactions (Pending Accounts) */}
        {budgets.length > 0 && (
          <ScheduledTransactionsList
            budgetId={budgets[0].id}
            year={currentYear}
            month={currentMonth}
            refreshKey={scheduledRefreshKey}
          />
        )}
      </div>

      {/* Charts */}
      <DashboardCharts
        dailyData={dailyChartData}
        monthlyData={monthlyChartData}
        isLoading={chartsLoading}
      />

      {/* Credit Card Spending */}
      {creditCards.length > 0 && (
        <CreditCardSpending
          creditCards={creditCards}
          isLoading={chartsLoading}
        />
      )}

      {/* Navigation Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
          <Link href="/app/budget">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <LayoutGridIcon className="h-5 w-5 text-primary" />
                Orçamento
              </CardTitle>
              <CardDescription>
                Visualize e edite suas categorias e valores planejados
              </CardDescription>
            </CardHeader>
          </Link>
        </Card>

        <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
          <Link href="/app/transactions">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <ReceiptIcon className="h-5 w-5 text-primary" />
                Transações
              </CardTitle>
              <CardDescription>
                Registre e visualize todas as suas movimentações
              </CardDescription>
            </CardHeader>
          </Link>
        </Card>

        <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
          <Link href="/app/settings">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <SettingsIcon className="h-5 w-5 text-primary" />
                Configurações
              </CardTitle>
              <CardDescription>
                Gerencie membros, convites e preferências
              </CardDescription>
            </CardHeader>
          </Link>
        </Card>
      </div>
    </div>
  );
}

export default AppHomepage;
