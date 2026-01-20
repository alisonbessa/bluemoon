"use client";

import { useState } from "react";
import { Button } from "@/shared/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/ui/alert-dialog";
import { Calendar, Rocket, Loader2, Copy, Sparkles } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { toast } from "sonner";
import { formatCurrency, monthNamesFull } from "./types";

interface MonthPlanningBannerProps {
  budgetId: string;
  year: number;
  month: number;
  status: "planning" | "active" | "closed";
  totalAllocated: number;
  totalIncome: number;
  onStatusChange: () => void;
  onCopyFromPrevious: () => void;
}

export function MonthPlanningBanner({
  budgetId,
  year,
  month,
  status,
  totalAllocated,
  totalIncome,
  onStatusChange,
  onCopyFromPrevious,
}: MonthPlanningBannerProps) {
  const [isStarting, setIsStarting] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const monthName = monthNamesFull[month - 1];
  const remaining = totalIncome - totalAllocated;
  const isFullyAllocated = remaining >= 0 && totalAllocated > 0;

  const handleStartMonth = async () => {
    setIsStarting(true);
    try {
      const response = await fetch("/api/app/budget/start-month", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ budgetId, year, month }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erro ao iniciar o mês");
      }

      toast.success(
        `Mês iniciado! ${data.createdTransactions} transações criadas.`
      );
      onStatusChange();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao iniciar");
    } finally {
      setIsStarting(false);
      setShowConfirmDialog(false);
    }
  };

  if (status === "active") {
    return null; // Don't show banner for active months
  }

  return (
    <>
      <div
        className={cn(
          "rounded-lg border-2 border-dashed p-4 mb-4",
          isFullyAllocated
            ? "border-green-300 bg-green-50 dark:border-green-800 dark:bg-green-950/30"
            : "border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30"
        )}
      >
        <div className="flex items-start gap-4">
          <div
            className={cn(
              "rounded-full p-3",
              isFullyAllocated
                ? "bg-green-100 dark:bg-green-900/50"
                : "bg-amber-100 dark:bg-amber-900/50"
            )}
          >
            <Calendar
              className={cn(
                "h-6 w-6",
                isFullyAllocated
                  ? "text-green-600 dark:text-green-400"
                  : "text-amber-600 dark:text-amber-400"
              )}
            />
          </div>

          <div className="flex-1 space-y-3">
            <div>
              <h3 className="font-semibold text-lg">
                Planejando {monthName} {year}
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                {isFullyAllocated
                  ? "Orçamento pronto! Clique em Iniciar Mês para criar as transações pendentes."
                  : "Configure suas alocações antes de iniciar o mês."}
              </p>
            </div>

            {/* Summary */}
            <div className="flex flex-wrap gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Receita: </span>
                <span className="font-semibold text-green-600">
                  {formatCurrency(totalIncome)}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Alocado: </span>
                <span className="font-semibold">{formatCurrency(totalAllocated)}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Disponível: </span>
                <span
                  className={cn(
                    "font-semibold",
                    remaining >= 0 ? "text-green-600" : "text-red-600"
                  )}
                >
                  {formatCurrency(remaining)}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={onCopyFromPrevious}
                className="gap-2"
              >
                <Copy className="h-4 w-4" />
                Copiar mês anterior
              </Button>

              <Button
                size="sm"
                onClick={() => setShowConfirmDialog(true)}
                disabled={!isFullyAllocated || isStarting}
                className="gap-2"
              >
                {isStarting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Rocket className="h-4 w-4" />
                )}
                Iniciar Mês
              </Button>
            </div>

            {!isFullyAllocated && totalAllocated === 0 && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Sparkles className="h-3 w-3" />
                Dica: Use Copiar mês anterior para começar rapidamente
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Iniciar {monthName}?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                Ao iniciar o mês, serão criadas transações pendentes para todas
                as despesas e receitas com data de vencimento definida.
              </p>
              <p className="font-medium">
                Você ainda poderá ajustar valores, mas as transações já estarão
                criadas.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleStartMonth} disabled={isStarting}>
              {isStarting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Iniciando...
                </>
              ) : (
                <>
                  <Rocket className="mr-2 h-4 w-4" />
                  Iniciar Mês
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
