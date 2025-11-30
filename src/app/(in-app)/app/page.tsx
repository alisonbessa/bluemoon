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
  CreditCardIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  ArrowRightIcon,
  LayoutGridIcon,
  ReceiptIcon,
  SettingsIcon,
  CalendarIcon,
  CheckCircle2Icon,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";
import useUser from "@/lib/users/useUser";

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

const monthNames = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

function formatCurrency(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
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
  const [commitmentsLoading, setCommitmentsLoading] = useState(true);
  const [monthSummary, setMonthSummary] = useState<MonthSummary | null>(null);

  // Month navigation
  const today = new Date();
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth() + 1);

  const hasCompletedOnboarding = !!user?.onboardingCompletedAt;

  const isCurrentMonth = currentYear === today.getFullYear() && currentMonth === today.getMonth() + 1;

  const handlePrevMonth = () => {
    if (currentMonth === 1) {
      setCurrentYear((y) => y - 1);
      setCurrentMonth(12);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 12) {
      setCurrentYear((y) => y + 1);
      setCurrentMonth(1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  const goToCurrentMonth = () => {
    setCurrentYear(today.getFullYear());
    setCurrentMonth(today.getMonth() + 1);
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
        }
      }
    } catch (err) {
      console.error("Error fetching dashboard data:", err);
    } finally {
      setCommitmentsLoading(false);
    }
  }, [currentYear, currentMonth]);

  useEffect(() => {
    if (user && hasCompletedOnboarding) {
      setCommitmentsLoading(true);
      fetchData();
    } else {
      setCommitmentsLoading(false);
    }
  }, [user, hasCompletedOnboarding, fetchData]);

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

        {/* Month Navigation */}
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handlePrevMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="flex flex-col items-center min-w-[140px]">
            <span className="text-lg font-semibold">
              {monthNames[currentMonth - 1]}
            </span>
            <span className="text-xs text-muted-foreground">{currentYear}</span>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleNextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          {!isCurrentMonth && (
            <Button variant="outline" size="sm" onClick={goToCurrentMonth} className="ml-2">
              Hoje
            </Button>
          )}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Disponível para Alocar
            </CardTitle>
            <WalletIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${(monthSummary?.available ?? 0) >= 0 ? "text-primary" : "text-red-600"}`}>
              {formatCurrency(monthSummary?.available ?? 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              {(monthSummary?.available ?? 0) === 0 ? "Tudo alocado!" : "Dinheiro sem categoria"}
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

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Saldo Livre
            </CardTitle>
            <CreditCardIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency((monthSummary?.expenses.allocated ?? 0) - (monthSummary?.expenses.spent ?? 0))}
            </div>
            <p className="text-xs text-muted-foreground">
              Alocado menos gasto
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Ações Rápidas</CardTitle>
            <CardDescription>
              Comece a organizar suas finanças
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <Button asChild className="justify-start">
              <Link href="/app/budgets/create">
                <PlusIcon className="mr-2 h-4 w-4" />
                Criar Novo Orçamento
              </Link>
            </Button>
            <Button asChild variant="outline" className="justify-start">
              <Link href="/app/accounts">
                <CreditCardIcon className="mr-2 h-4 w-4" />
                Gerenciar Contas
              </Link>
            </Button>
            <Button asChild variant="outline" className="justify-start">
              <Link href="/app/transactions">
                <ReceiptIcon className="mr-2 h-4 w-4" />
                Ver Transações
              </Link>
            </Button>
            <Button asChild variant="outline" className="justify-start">
              <Link href="/app/budget">
                <LayoutGridIcon className="mr-2 h-4 w-4" />
                Orçamento Mensal
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* Commitments or Getting Started */}
        {hasCompletedOnboarding ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarIcon className="h-5 w-5" />
                Próximos Compromissos
              </CardTitle>
              <CardDescription>
                Contas e pagamentos dos próximos 30 dias
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {commitmentsLoading ? (
                <div className="flex flex-col gap-2">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : commitments.length > 0 ? (
                <>
                  {commitments.slice(0, 5).map((commitment) => {
                    const daysUntil = getDaysUntil(commitment.targetDate);
                    const isUrgent = daysUntil <= 3;

                    return (
                      <div
                        key={commitment.id}
                        className="flex items-center justify-between p-2 rounded-lg border bg-muted/30"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-lg">{commitment.icon || "📌"}</span>
                          <div>
                            <div className="font-medium text-sm">{commitment.name}</div>
                            <div className={`text-xs ${isUrgent ? "text-red-500" : "text-muted-foreground"}`}>
                              {daysUntil === 0
                                ? "Vence hoje!"
                                : daysUntil === 1
                                  ? "Vence amanhã"
                                  : daysUntil < 0
                                    ? "Vencido"
                                    : `Vence em ${daysUntil} dias`}{" "}
                              ({formatDate(commitment.targetDate)})
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold text-sm">
                            {formatCurrency(commitment.allocated)}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {commitments.length > 5 && (
                    <Button asChild variant="ghost" size="sm" className="mt-1">
                      <Link href="/app/budget">
                        Ver todos ({commitments.length})
                        <ArrowRightIcon className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                  )}
                </>
              ) : (
                <div className="flex flex-col items-center justify-center py-4 text-center">
                  <CheckCircle2Icon className="h-10 w-10 text-green-500 mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Nenhum compromisso nos próximos 30 dias
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Configure datas de vencimento no orçamento
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Primeiros Passos</CardTitle>
              <CardDescription>
                Configure seu orçamento em 3 passos simples
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex items-start gap-4">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
                  1
                </div>
                <div>
                  <h4 className="font-medium">Crie um Orçamento</h4>
                  <p className="text-sm text-muted-foreground">
                    Dê um nome e configure as categorias iniciais
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground text-sm font-bold">
                  2
                </div>
                <div>
                  <h4 className="font-medium">Adicione suas Contas</h4>
                  <p className="text-sm text-muted-foreground">
                    Conta corrente, poupança e cartões de crédito
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground text-sm font-bold">
                  3
                </div>
                <div>
                  <h4 className="font-medium">Distribua seu Dinheiro</h4>
                  <p className="text-sm text-muted-foreground">
                    Aloque cada real em uma categoria
                  </p>
                </div>
              </div>
              <Button asChild className="mt-2">
                <Link href="/app/budgets/create">
                  Começar Agora
                  <ArrowRightIcon className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

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
