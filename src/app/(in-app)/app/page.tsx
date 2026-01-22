"use client";

import React, { useState } from "react";
import { Button } from "@/shared/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/ui/card";
import { Skeleton } from "@/shared/ui/skeleton";
import { Alert, AlertDescription } from "@/shared/ui/alert";
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
import { Progress } from "@/shared/ui/progress";
import { MonthSelector } from "@/shared/ui/month-selector";
import {
  DashboardCharts,
  CreditCardSpending,
  ScheduledTransactionsList,
  useDashboardData,
} from "@/features/dashboard";
import Link from "next/link";
import { useUser } from "@/shared/hooks/use-current-user";
import { formatCurrency } from "@/shared/lib/formatters";

function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-64 sm:w-96" />
      </div>
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>
      <div className="grid gap-6 grid-cols-1 md:grid-cols-2">
        <Skeleton className="h-64" />
        <Skeleton className="h-64" />
      </div>
    </div>
  );
}

function AppHomepage() {
  const { user, isLoading: userLoading, error } = useUser();

  // Month navigation
  const today = new Date();
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth() + 1);

  // Dashboard data via SWR
  const {
    budgets,
    monthSummary,
    goals,
    dailyChartData,
    monthlyChartData,
    creditCards,
    isLoading: dataLoading,
    chartsLoading,
    goalsLoading,
  } = useDashboardData(currentYear, currentMonth);

  const isLoading = userLoading || dataLoading;

  const handleMonthChange = (year: number, month: number) => {
    setCurrentYear(year);
    setCurrentMonth(month);
  };

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
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
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
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
