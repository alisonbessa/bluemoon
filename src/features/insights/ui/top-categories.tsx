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
  ArrowUpIcon,
  ArrowDownIcon,
  TrendingUpIcon,
  AlertTriangleIcon,
} from "lucide-react";
import { formatCurrency } from "@/shared/lib/formatters";
import type { TopCategory, OverBudgetCategory } from "../types";

interface TopCategoriesListProps {
  topCategories: TopCategory[];
  overBudgetCategories: OverBudgetCategory[];
}

export function TopCategoriesList({
  topCategories,
  overBudgetCategories,
}: TopCategoriesListProps) {
  return (
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
      {/* Top Categories */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUpIcon className="h-4 w-4" />
            Maiores Gastos
          </CardTitle>
          <CardDescription>Top 5 categorias por valor gasto</CardDescription>
        </CardHeader>
        <CardContent>
          {topCategories.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhuma despesa no período
            </p>
          ) : (
            <div className="space-y-3">
              {topCategories.map((cat) => (
                <div key={cat.id} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-1.5">
                      <span>{cat.icon || "📦"}</span>
                      <span className="font-medium truncate">{cat.name}</span>
                    </span>
                    <span className="flex items-center gap-2 shrink-0">
                      <span className="font-medium tabular-nums">
                        {formatCurrency(cat.spent)}
                      </span>
                      {cat.variation !== null && (
                        <span
                          className={`flex items-center text-xs ${
                            cat.variation > 0
                              ? "text-red-500"
                              : cat.variation < 0
                                ? "text-green-500"
                                : "text-muted-foreground"
                          }`}
                        >
                          {cat.variation > 0 ? (
                            <ArrowUpIcon className="h-3 w-3" />
                          ) : cat.variation < 0 ? (
                            <ArrowDownIcon className="h-3 w-3" />
                          ) : null}
                          {Math.abs(cat.variation)}%
                        </span>
                      )}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Progress
                      value={cat.percentOfTotal}
                      className="h-1.5 flex-1"
                      style={
                        cat.color
                          ? ({ "--progress-background": cat.color } as React.CSSProperties)
                          : undefined
                      }
                    />
                    <span className="text-xs text-muted-foreground tabular-nums w-8 text-right">
                      {cat.percentOfTotal}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Over Budget Categories */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertTriangleIcon className="h-4 w-4" />
            Categorias Excedidas
          </CardTitle>
          <CardDescription>Categorias que ultrapassaram o planejado</CardDescription>
        </CardHeader>
        <CardContent>
          {overBudgetCategories.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-4 text-center">
              <p className="text-sm text-green-600 font-medium">
                Tudo dentro do orçamento!
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Nenhuma categoria excedeu o planejado
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {overBudgetCategories.map((cat) => (
                <div key={cat.id} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-1.5">
                      <span>{cat.icon || "📦"}</span>
                      <span className="font-medium truncate">{cat.name}</span>
                    </span>
                    <span className="text-red-600 font-medium text-xs">
                      +{cat.overPercent}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Planejado: {formatCurrency(cat.allocated)}</span>
                    <span className="text-red-600">
                      Excedido: {formatCurrency(cat.overAmount)}
                    </span>
                  </div>
                  <Progress
                    value={100}
                    className="h-1.5 [&>div]:bg-red-600"
                  />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
