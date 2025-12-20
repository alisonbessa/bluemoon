"use client";

import { useMemo } from "react";
import { TrendingUp, TrendingDown, Equal, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";
import { GroupData, formatCurrency, GROUP_COLORS } from "./types";

interface BudgetComparisonProps {
  groupsData: GroupData[];
  totals: {
    allocated: number;
    spent: number;
    available: number;
  };
  incomeTotal: number;
}

export function BudgetComparison({
  groupsData,
  totals,
  incomeTotal,
}: BudgetComparisonProps) {
  // Calculate comparison metrics
  const metrics = useMemo(() => {
    const budgetUtilization = totals.allocated > 0 
      ? (totals.spent / totals.allocated) * 100 
      : 0;
    
    const incomeUtilization = incomeTotal > 0 
      ? (totals.allocated / incomeTotal) * 100 
      : 0;
    
    const savings = incomeTotal - totals.spent;
    const savingsRate = incomeTotal > 0 
      ? (savings / incomeTotal) * 100 
      : 0;

    return {
      budgetUtilization: Math.round(budgetUtilization),
      incomeUtilization: Math.round(incomeUtilization),
      savings,
      savingsRate: Math.round(savingsRate),
    };
  }, [totals, incomeTotal]);

  // Sort groups by spent amount for the chart
  const sortedGroups = useMemo(() => {
    return [...groupsData]
      .filter(g => g.totals.allocated > 0 || g.totals.spent > 0)
      .sort((a, b) => b.totals.spent - a.totals.spent);
  }, [groupsData]);

  // Find max value for scaling
  const maxValue = useMemo(() => {
    return Math.max(
      ...sortedGroups.map(g => Math.max(g.totals.allocated, g.totals.spent)),
      1
    );
  }, [sortedGroups]);

  if (groupsData.length === 0) {
    return null;
  }

  return (
    <div className="rounded-lg border bg-card">
      {/* Header */}
      <div className="flex items-center gap-2 p-3 border-b bg-muted/30">
        <BarChart3 className="h-4 w-4 text-primary" />
        <span className="font-semibold text-sm">Comparativo Orçado vs Real</span>
      </div>

      <div className="p-4 space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-3">
          {/* Budget Utilization */}
          <div className="rounded-lg border p-3 space-y-1">
            <div className="text-xs text-muted-foreground">Uso do Orçamento</div>
            <div className="flex items-center gap-2">
              <span className={cn(
                "text-xl font-bold tabular-nums",
                metrics.budgetUtilization > 100 ? "text-red-600" :
                metrics.budgetUtilization > 80 ? "text-amber-600" :
                "text-green-600"
              )}>
                {metrics.budgetUtilization}%
              </span>
              {metrics.budgetUtilization > 100 ? (
                <TrendingUp className="h-4 w-4 text-red-500" />
              ) : metrics.budgetUtilization < 50 ? (
                <TrendingDown className="h-4 w-4 text-green-500" />
              ) : (
                <Equal className="h-4 w-4 text-amber-500" />
              )}
            </div>
            <div className="text-xs text-muted-foreground">
              {formatCurrency(totals.spent)} de {formatCurrency(totals.allocated)}
            </div>
          </div>

          {/* Income Utilization */}
          <div className="rounded-lg border p-3 space-y-1">
            <div className="text-xs text-muted-foreground">Renda Comprometida</div>
            <div className="flex items-center gap-2">
              <span className={cn(
                "text-xl font-bold tabular-nums",
                metrics.incomeUtilization > 100 ? "text-red-600" :
                metrics.incomeUtilization > 90 ? "text-amber-600" :
                "text-green-600"
              )}>
                {metrics.incomeUtilization}%
              </span>
            </div>
            <div className="text-xs text-muted-foreground">
              {formatCurrency(totals.allocated)} de {formatCurrency(incomeTotal)}
            </div>
          </div>

          {/* Savings */}
          <div className="rounded-lg border p-3 space-y-1">
            <div className="text-xs text-muted-foreground">Sobra Estimada</div>
            <div className="flex items-center gap-2">
              <span className={cn(
                "text-xl font-bold tabular-nums",
                metrics.savings < 0 ? "text-red-600" : "text-green-600"
              )}>
                {formatCurrency(metrics.savings)}
              </span>
            </div>
            <div className="text-xs text-muted-foreground">
              {metrics.savingsRate}% da renda
            </div>
          </div>
        </div>

        {/* Group Comparison Bars */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-muted-foreground">Por Grupo</h4>
          
          {sortedGroups.map(({ group, totals: groupTotals }) => {
            const allocatedWidth = (groupTotals.allocated / maxValue) * 100;
            const spentWidth = (groupTotals.spent / maxValue) * 100;
            const overBudget = groupTotals.spent > groupTotals.allocated;
            const color = GROUP_COLORS[group.code] || "#6b7280";

            return (
              <div key={group.id} className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span>{group.icon}</span>
                    <span className="font-medium">{group.name}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs tabular-nums">
                    <span className="text-muted-foreground">
                      Orçado: {formatCurrency(groupTotals.allocated)}
                    </span>
                    <span className={overBudget ? "text-red-600 font-medium" : ""}>
                      Gasto: {formatCurrency(groupTotals.spent)}
                    </span>
                  </div>
                </div>

                {/* Comparison Bar */}
                <div className="relative h-6 bg-muted/50 rounded overflow-hidden">
                  {/* Allocated (background bar) */}
                  <div
                    className="absolute inset-y-0 left-0 bg-muted-foreground/20 rounded"
                    style={{ width: `${allocatedWidth}%` }}
                  />
                  {/* Spent (foreground bar) */}
                  <div
                    className={cn(
                      "absolute inset-y-0 left-0 rounded transition-all",
                      overBudget ? "bg-red-500" : ""
                    )}
                    style={{ 
                      width: `${spentWidth}%`,
                      backgroundColor: overBudget ? undefined : color,
                      opacity: 0.8,
                    }}
                  />
                  {/* Budget line marker */}
                  {groupTotals.allocated > 0 && (
                    <div
                      className="absolute inset-y-0 w-0.5 bg-foreground/60"
                      style={{ left: `${allocatedWidth}%` }}
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground pt-2 border-t">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 bg-muted-foreground/20 rounded" />
            <span>Orçado</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 bg-primary/60 rounded" />
            <span>Gasto</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-0.5 h-3 bg-foreground/60" />
            <span>Limite</span>
          </div>
        </div>
      </div>
    </div>
  );
}
