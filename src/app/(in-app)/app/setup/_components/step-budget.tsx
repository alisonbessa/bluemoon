"use client";

import { useState } from "react";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { ArrowLeft, Loader2, ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { formatAmount } from "@/shared/lib/formatters";
import type { TemplateCategory } from "@/shared/lib/budget-templates";

interface CategoryWithAmount extends TemplateCategory {
  plannedAmount: number;
}

interface StepBudgetProps {
  categories: CategoryWithAmount[];
  totalIncomeCents: number;
  onCategoriesChange: (categories: CategoryWithAmount[]) => void;
  onSubmit: () => void;
  onBack: () => void;
  isSubmitting: boolean;
}

const GROUP_LABELS: Record<string, { label: string; color: string }> = {
  essential: { label: "Essencial", color: "bg-red-500" },
  lifestyle: { label: "Estilo de Vida", color: "bg-orange-500" },
  investments: { label: "Investimentos", color: "bg-green-500" },
  goals: { label: "Metas", color: "bg-violet-500" },
};

export function StepBudget({
  categories,
  totalIncomeCents,
  onCategoriesChange,
  onSubmit,
  onBack,
  isSubmitting,
}: StepBudgetProps) {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(
    new Set(["essential", "lifestyle"])
  );

  const toggleGroup = (groupCode: string) => {
    const next = new Set(expandedGroups);
    if (next.has(groupCode)) {
      next.delete(groupCode);
    } else {
      next.add(groupCode);
    }
    setExpandedGroups(next);
  };

  const updateAmount = (index: number, value: string) => {
    const numericValue = value.replace(/\D/g, "");
    const cents = parseInt(numericValue || "0", 10);
    const updated = [...categories];
    updated[index] = { ...updated[index], plannedAmount: cents };
    onCategoriesChange(updated);
  };

  const totalAllocated = categories.reduce(
    (sum, c) => sum + c.plannedAmount,
    0
  );
  const remaining = totalIncomeCents - totalAllocated;
  const allocationPercent =
    totalIncomeCents > 0
      ? Math.round((totalAllocated / totalIncomeCents) * 100)
      : 0;

  // Group categories
  const groupedCategories = categories.reduce(
    (acc, cat, index) => {
      if (!acc[cat.groupCode]) {
        acc[cat.groupCode] = [];
      }
      acc[cat.groupCode].push({ ...cat, originalIndex: index });
      return acc;
    },
    {} as Record<string, (CategoryWithAmount & { originalIndex: number })[]>
  );

  const groupOrder = ["essential", "lifestyle", "investments", "goals"];

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">Seu orçamento</h2>
        <p className="text-muted-foreground">
          Veja como sua renda está distribuída. Ajuste os valores se quiser.
        </p>
      </div>

      {/* Total bar */}
      <div className="rounded-lg border p-4 space-y-2">
        <div className="flex justify-between text-sm">
          <span>
            Planejado: <strong>R$ {formatAmount(totalAllocated)}</strong>
          </span>
          <span>
            Renda: <strong>R$ {formatAmount(totalIncomeCents)}</strong>
          </span>
        </div>
        <div className="h-3 bg-muted rounded-full overflow-hidden">
          <div
            className={cn(
              "h-full rounded-full transition-all",
              allocationPercent > 100 ? "bg-destructive" : "bg-primary"
            )}
            style={{ width: `${Math.min(allocationPercent, 100)}%` }}
          />
        </div>
        <p
          className={cn(
            "text-xs text-right",
            remaining < 0
              ? "text-destructive"
              : remaining > 0
                ? "text-muted-foreground"
                : "text-green-600"
          )}
        >
          {remaining > 0
            ? `R$ ${formatAmount(remaining)} disponível`
            : remaining < 0
              ? `R$ ${formatAmount(Math.abs(remaining))} acima da renda`
              : "Renda 100% planejada"}
        </p>
      </div>

      {/* Groups */}
      <div className="space-y-3">
        {groupOrder
          .filter((code) => groupedCategories[code])
          .map((groupCode) => {
            const groupCats = groupedCategories[groupCode];
            const groupInfo = GROUP_LABELS[groupCode] || {
              label: groupCode,
              color: "bg-gray-500",
            };
            const groupTotal = groupCats.reduce(
              (sum, c) => sum + c.plannedAmount,
              0
            );
            const groupPercent =
              totalIncomeCents > 0
                ? Math.round((groupTotal / totalIncomeCents) * 100)
                : 0;
            const isExpanded = expandedGroups.has(groupCode);

            return (
              <div key={groupCode} className="rounded-lg border overflow-hidden">
                <button
                  onClick={() => toggleGroup(groupCode)}
                  className="w-full flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors"
                >
                  <div className={cn("w-3 h-3 rounded-full", groupInfo.color)} />
                  <span className="font-medium flex-1 text-left">
                    {groupInfo.label}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    R$ {formatAmount(groupTotal)} ({groupPercent}%)
                  </span>
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  )}
                </button>

                {isExpanded && (
                  <div className="border-t divide-y">
                    {groupCats.map((cat) => (
                      <div
                        key={cat.originalIndex}
                        className="flex items-center gap-3 px-3 py-2"
                      >
                        <span className="text-base w-6 text-center">
                          {cat.icon}
                        </span>
                        <span className="flex-1 text-sm">{cat.name}</span>
                        <div className="w-32">
                          <Input
                            className="text-right text-sm h-8"
                            value={
                              cat.plannedAmount > 0
                                ? formatAmount(cat.plannedAmount)
                                : ""
                            }
                            placeholder="0,00"
                            onChange={(e) =>
                              updateAmount(cat.originalIndex, e.target.value)
                            }
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
      </div>

      <div className="flex gap-3">
        <Button
          variant="outline"
          size="lg"
          onClick={onBack}
          className="flex-1"
          disabled={isSubmitting}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>
        <Button
          size="lg"
          onClick={onSubmit}
          className="flex-1"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Criando...
            </>
          ) : (
            "Parece bom, vamos lá!"
          )}
        </Button>
      </div>
    </div>
  );
}
