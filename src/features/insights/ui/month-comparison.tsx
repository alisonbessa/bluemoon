"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/ui/card";
import {
  ArrowUpIcon,
  ArrowDownIcon,
  MinusIcon,
  ArrowLeftRightIcon,
} from "lucide-react";
import { formatCurrency } from "@/shared/lib/formatters";
import type { MonthComparison } from "../types";

interface MonthComparisonCardProps {
  comparison: MonthComparison;
}

function VariationBadge({
  variation,
  invertColor,
}: {
  variation: number | null;
  invertColor?: boolean;
}) {
  if (variation === null) {
    return (
      <span className="text-xs text-muted-foreground">sem dados anteriores</span>
    );
  }

  const isPositive = variation > 0;
  const isNegative = variation < 0;

  // For expenses, positive variation (increase) is bad (red), decrease is good (green)
  // For income/savings, positive variation is good (green), decrease is bad (red)
  let colorClass = "text-muted-foreground";
  if (isPositive) {
    colorClass = invertColor ? "text-red-600" : "text-green-600";
  } else if (isNegative) {
    colorClass = invertColor ? "text-green-600" : "text-red-600";
  }

  return (
    <span className={`flex items-center gap-0.5 text-sm font-medium ${colorClass}`}>
      {isPositive ? (
        <ArrowUpIcon className="h-3.5 w-3.5" />
      ) : isNegative ? (
        <ArrowDownIcon className="h-3.5 w-3.5" />
      ) : (
        <MinusIcon className="h-3.5 w-3.5" />
      )}
      {Math.abs(variation)}%
    </span>
  );
}

export function MonthComparisonCard({ comparison }: MonthComparisonCardProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <ArrowLeftRightIcon className="h-4 w-4" />
          Comparação com Mês Anterior
        </CardTitle>
        <CardDescription>Variação em relação ao período anterior</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-4">
          {/* Income */}
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Receitas</p>
            <p className="text-base font-bold">{formatCurrency(comparison.income.current)}</p>
            <div className="flex items-center gap-1">
              <VariationBadge variation={comparison.income.variation} />
            </div>
            {comparison.income.previous > 0 && (
              <p className="text-xs text-muted-foreground">
                Anterior: {formatCurrency(comparison.income.previous)}
              </p>
            )}
          </div>

          {/* Expense */}
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Despesas</p>
            <p className="text-base font-bold">{formatCurrency(comparison.expense.current)}</p>
            <div className="flex items-center gap-1">
              <VariationBadge variation={comparison.expense.variation} invertColor />
            </div>
            {comparison.expense.previous > 0 && (
              <p className="text-xs text-muted-foreground">
                Anterior: {formatCurrency(comparison.expense.previous)}
              </p>
            )}
          </div>

          {/* Savings */}
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Economia</p>
            <p className={`text-base font-bold ${comparison.savings.current >= 0 ? "text-green-600" : "text-red-600"}`}>
              {formatCurrency(comparison.savings.current)}
            </p>
            <div className="flex items-center gap-1">
              <VariationBadge variation={comparison.savings.variation} />
            </div>
            {comparison.savings.previous !== 0 && (
              <p className="text-xs text-muted-foreground">
                Anterior: {formatCurrency(comparison.savings.previous)}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
