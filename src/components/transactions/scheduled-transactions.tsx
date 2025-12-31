"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import {
  Calendar,
  CheckCircle2,
  Clock,
  TrendingDown,
  TrendingUp,
  ChevronDown,
  ChevronUp,
  Pencil,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ScheduledTransaction {
  id: string;
  type: "expense" | "income";
  name: string;
  icon?: string | null;
  amount: number;
  dueDay: number;
  dueDate: string;
  isPaid: boolean;
  sourceType: "category" | "income_source" | "goal";
  sourceId: string;
  categoryId?: string;
  incomeSourceId?: string;
  goalId?: string;
}

interface ScheduledTotals {
  expenses: number;
  income: number;
  paidExpenses: number;
  paidIncome: number;
}

interface ScheduledTransactionsProps {
  budgetId: string;
  year: number;
  month: number;
  refreshKey?: number;
  onConfirm?: (transaction: ScheduledTransaction) => void;
  onEdit?: (transaction: ScheduledTransaction) => void;
}

function formatCurrency(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatCurrencyCompact(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function ScheduledTransactions({
  budgetId,
  year,
  month,
  refreshKey,
  onConfirm,
  onEdit,
}: ScheduledTransactionsProps) {
  const [scheduled, setScheduled] = useState<ScheduledTransaction[]>([]);
  const [totals, setTotals] = useState<ScheduledTotals>({
    expenses: 0,
    income: 0,
    paidExpenses: 0,
    paidIncome: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(true);

  const fetchScheduled = useCallback(async () => {
    if (!budgetId) return;

    try {
      const response = await fetch(
        `/api/app/transactions/scheduled?budgetId=${budgetId}&year=${year}&month=${month}`
      );

      if (response.ok) {
        const data = await response.json();
        setScheduled(data.scheduledTransactions || []);
        setTotals(data.totals || { expenses: 0, income: 0, paidExpenses: 0, paidIncome: 0 });
      }
    } catch (error) {
      console.error("Error fetching scheduled transactions:", error);
    } finally {
      setIsLoading(false);
    }
  }, [budgetId, year, month]);

  useEffect(() => {
    fetchScheduled();
  }, [fetchScheduled, refreshKey]);

  if (isLoading || scheduled.length === 0) {
    return null;
  }

  const today = new Date();
  const currentDay = today.getDate();
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() + 1 === month;

  const unpaidExpenses = scheduled.filter((s) => s.type === "expense" && !s.isPaid);
  const unpaidIncome = scheduled.filter((s) => s.type === "income" && !s.isPaid);
  const overdueCount = unpaidExpenses.filter(
    (s) => isCurrentMonth && s.dueDay < currentDay
  ).length;

  const expenseProgress = totals.expenses > 0
    ? (totals.paidExpenses / totals.expenses) * 100
    : 0;
  const incomeProgress = totals.income > 0
    ? (totals.paidIncome / totals.income) * 100
    : 0;

  return (
    <div className="rounded-lg border bg-card">
      {/* Header */}
      <button
        className="flex items-center justify-between w-full p-3 hover:bg-muted/50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-primary" />
          <span className="font-semibold">Transações Agendadas</span>
          {overdueCount > 0 && (
            <span className="px-2 py-0.5 text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 rounded-full">
              {overdueCount} atrasada{overdueCount > 1 ? "s" : ""}
            </span>
          )}
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-4 text-sm">
            <span className="text-muted-foreground">
              {unpaidExpenses.length + unpaidIncome.length} pendente{unpaidExpenses.length + unpaidIncome.length !== 1 ? "s" : ""}
            </span>
          </div>
          {isExpanded ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </button>

      {isExpanded && (
        <div className="border-t">
          {/* Progress Summary */}
          <div className="grid grid-cols-2 gap-4 p-3 bg-muted/30">
            <div className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <TrendingDown className="h-3.5 w-3.5 text-red-500" />
                  Despesas
                </span>
                <span className="font-medium">
                  {formatCurrency(totals.paidExpenses)} / {formatCurrency(totals.expenses)}
                </span>
              </div>
              <Progress value={expenseProgress} className="h-1.5" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <TrendingUp className="h-3.5 w-3.5 text-green-500" />
                  Receitas
                </span>
                <span className="font-medium">
                  {formatCurrency(totals.paidIncome)} / {formatCurrency(totals.income)}
                </span>
              </div>
              <Progress value={incomeProgress} className="h-1.5" />
            </div>
          </div>

          {/* Scheduled Items */}
          <div className="divide-y">
            {scheduled.map((item) => {
              const isOverdue = isCurrentMonth && !item.isPaid && item.dueDay < currentDay;
              const isToday = isCurrentMonth && item.dueDay === currentDay;

              return (
                <div
                  key={item.id}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2",
                    item.isPaid && "opacity-60",
                    isOverdue && !item.isPaid && "bg-red-50 dark:bg-red-950/20"
                  )}
                >
                  <div className="flex items-center justify-center w-6">
                    {item.isPaid ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    ) : isOverdue ? (
                      <Clock className="h-4 w-4 text-red-500" />
                    ) : (
                      <span className="text-base">{item.icon || (item.type === "income" ? "💰" : "📋")}</span>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "font-medium text-sm",
                        item.isPaid && "line-through"
                      )}>
                        {item.name}
                      </span>
                      {isToday && !item.isPaid && (
                        <span className="px-1.5 py-0.5 text-[10px] font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 rounded">
                          HOJE
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      Dia {item.dueDay}
                    </span>
                  </div>

                  <div className={cn(
                    "font-medium tabular-nums text-sm",
                    item.type === "income" ? "text-green-600" : "text-red-600",
                    item.isPaid && "line-through"
                  )}>
                    {item.type === "income" ? "+" : "-"}{formatCurrencyCompact(item.amount)}
                  </div>

                  {!item.isPaid && (
                    <div className="flex items-center gap-1">
                      {onEdit && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => onEdit(item)}
                          title="Editar antes de confirmar"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      {onConfirm && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => onConfirm(item)}
                        >
                          Confirmar
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
