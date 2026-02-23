"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/ui/card";
import { Progress } from "@/shared/ui/progress";
import {
  HeartPulseIcon,
  TrendingUpIcon,
  CalendarIcon,
  ReceiptIcon,
} from "lucide-react";
import { formatCurrency } from "@/shared/lib/formatters";
import type { BudgetHealth, Projection, InsightsSummary, InsightsMonth } from "../types";

interface InsightsCardsProps {
  summary: InsightsSummary;
  budgetHealth: BudgetHealth;
  projection: Projection;
  month: InsightsMonth;
}

const healthLabels: Record<BudgetHealth["status"], string> = {
  excellent: "Excelente",
  good: "Bom",
  warning: "Atenção",
  critical: "Crítico",
};

const healthColors: Record<BudgetHealth["status"], string> = {
  excellent: "text-green-600",
  good: "text-blue-600",
  warning: "text-yellow-600",
  critical: "text-red-600",
};

const healthProgressColors: Record<BudgetHealth["status"], string> = {
  excellent: "[&>div]:bg-green-600",
  good: "[&>div]:bg-blue-600",
  warning: "[&>div]:bg-yellow-600",
  critical: "[&>div]:bg-red-600",
};

export function InsightsCards({
  summary,
  budgetHealth,
  projection,
  month,
}: InsightsCardsProps) {
  return (
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
      {/* Budget Health */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <HeartPulseIcon className="h-4 w-4" />
            Saúde do Orçamento
          </CardTitle>
          <CardDescription>
            {month.isCurrentMonth
              ? `${budgetHealth.monthProgress}% do mês, ${budgetHealth.spentPercent}% do orçamento gasto`
              : `${budgetHealth.spentPercent}% do orçamento utilizado`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <span className={`text-2xl font-bold ${healthColors[budgetHealth.status]}`}>
              {healthLabels[budgetHealth.status]}
            </span>
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Orçamento utilizado</span>
              <span>{budgetHealth.spentPercent}%</span>
            </div>
            <Progress
              value={Math.min(budgetHealth.spentPercent, 100)}
              className={`h-2 ${healthProgressColors[budgetHealth.status]}`}
            />
          </div>
          {month.isCurrentMonth && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Mês decorrido</span>
                <span>{budgetHealth.monthProgress}%</span>
              </div>
              <Progress value={budgetHealth.monthProgress} className="h-2" />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Projection (only for current month) or Savings */}
      {month.isCurrentMonth ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUpIcon className="h-4 w-4" />
              Projeção do Mês
            </CardTitle>
            <CardDescription>
              Baseado no gasto médio diário de {formatCurrency(projection.dailyAvgExpense)}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Gasto projetado</p>
                <p className={`text-lg font-bold ${!projection.isOnTrack ? "text-red-600" : ""}`}>
                  {formatCurrency(projection.projectedExpense)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Economia projetada</p>
                <p className={`text-lg font-bold ${projection.projectedSavings >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {formatCurrency(projection.projectedSavings)}
                </p>
              </div>
            </div>
            {summary.totalAllocated > 0 && (
              <p className="text-xs text-muted-foreground">
                {projection.isOnTrack
                  ? "Você está dentro do orçamento planejado"
                  : `Projeção excede o orçamento em ${formatCurrency(projection.projectedExpense - summary.totalAllocated)}`}
              </p>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarIcon className="h-4 w-4" />
              Resumo do Mês
            </CardTitle>
            <CardDescription>Resultado final do período</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Total gasto</p>
                <p className="text-lg font-bold">
                  {formatCurrency(summary.expense)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Economia</p>
                <p className={`text-lg font-bold ${summary.savings >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {formatCurrency(summary.savings)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Daily Average */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <ReceiptIcon className="h-4 w-4" />
            Média Diária
          </CardTitle>
          <CardDescription>
            {summary.transactionCount} transações no período
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Gasto por dia</p>
              <p className="text-lg font-bold">
                {formatCurrency(projection.dailyAvgExpense)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">
                {summary.totalAllocated > 0 ? "Orçamento restante" : "Receita restante"}
              </p>
              <p className={`text-lg font-bold ${(summary.totalAllocated > 0 ? summary.totalAllocated - summary.expense : summary.income - summary.expense) >= 0 ? "text-green-600" : "text-red-600"}`}>
                {formatCurrency(
                  summary.totalAllocated > 0
                    ? summary.totalAllocated - summary.expense
                    : summary.income - summary.expense
                )}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Savings Rate */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUpIcon className="h-4 w-4" />
            Taxa de Economia
          </CardTitle>
          <CardDescription>Percentual poupado da receita</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <span className={`text-3xl font-bold ${summary.savings >= 0 ? "text-green-600" : "text-red-600"}`}>
              {summary.income > 0
                ? `${Math.round((summary.savings / summary.income) * 100)}%`
                : "—"}
            </span>
            <div className="flex-1">
              <p className="text-xs text-muted-foreground">Receita</p>
              <p className="text-sm font-medium">{formatCurrency(summary.income)}</p>
              <p className="text-xs text-muted-foreground mt-1">Despesa</p>
              <p className="text-sm font-medium">{formatCurrency(summary.expense)}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
