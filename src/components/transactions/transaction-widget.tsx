"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { formatCurrencyCompact, parseLocalDate } from "@/lib/formatters";
import {
  Check,
  CheckCircle2,
  Clock,
  Pencil,
  ArrowLeftRight,
  Trash2,
  Undo2,
  AlertCircle,
  Loader2,
  Lock,
  Rocket,
  Copy,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  PeriodNavigator,
  type PeriodValue,
} from "@/components/ui/period-navigator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ScheduledTransaction {
  id: string;
  type: "expense" | "income";
  name: string;
  icon?: string | null;
  amount: number;
  dueDay: number;
  dueDate: string;
  isPaid: boolean;
  sourceType: "category" | "income_source" | "goal" | "recurring_bill";
  sourceId: string;
  categoryId?: string;
  incomeSourceId?: string;
  goalId?: string;
  recurringBillId?: string;
}

interface ConfirmedTransaction {
  id: string;
  date: string;
  description?: string | null;
  amount: number;
  type: "income" | "expense" | "transfer";
  categoryId?: string | null;
  incomeSourceId?: string | null;
  recurringBillId?: string | null;
  accountId: string;
  status: string;
  isInstallment?: boolean;
  installmentNumber?: number | null;
  totalInstallments?: number | null;
  account?: { id: string; name: string; icon?: string | null } | null;
  category?: { id: string; name: string; icon?: string | null } | null;
  incomeSource?: { id: string; name: string; type: string } | null;
}

interface TransactionWidgetProps {
  budgetId: string;
  refreshKey?: number;
  confirmedTransactions: ConfirmedTransaction[];
  searchTerm?: string;
  typeFilter?: string;
  categoryFilter?: string;
  accountFilter?: string;
  // Period props (monthly only)
  periodValue: PeriodValue;
  onPeriodChange: (value: PeriodValue) => void;
  onConfirm?: (transaction: ScheduledTransaction) => void;
  onEdit?: (transaction: ScheduledTransaction) => void;
  onEditConfirmed?: (transaction: ConfirmedTransaction) => void;
  onDeleteConfirmed?: (transaction: ConfirmedTransaction) => void;
  // Month actions
  onStartMonth?: () => Promise<void>;
  onCopyPreviousMonth?: () => Promise<void>;
}

export function TransactionWidget({
  budgetId,
  refreshKey,
  confirmedTransactions,
  searchTerm = "",
  typeFilter = "all",
  categoryFilter = "all",
  accountFilter = "all",
  periodValue,
  onPeriodChange,
  onConfirm,
  onEdit,
  onEditConfirmed,
  onDeleteConfirmed,
  onStartMonth,
  onCopyPreviousMonth,
}: TransactionWidgetProps) {
  const [scheduled, setScheduled] = useState<ScheduledTransaction[]>([]);
  const [monthStatus, setMonthStatus] = useState<string>("active");
  const [hasAllocations, setHasAllocations] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isStartingMonth, setIsStartingMonth] = useState(false);
  const [isCopyingMonth, setIsCopyingMonth] = useState(false);

  const handleStartMonth = async () => {
    if (!onStartMonth) return;
    setIsStartingMonth(true);
    try {
      await onStartMonth();
      await fetchScheduled();
    } finally {
      setIsStartingMonth(false);
    }
  };

  const handleCopyPreviousMonth = async () => {
    if (!onCopyPreviousMonth) return;
    setIsCopyingMonth(true);
    try {
      await onCopyPreviousMonth();
      await fetchScheduled();
    } finally {
      setIsCopyingMonth(false);
    }
  };

  const fetchScheduled = useCallback(async () => {
    if (!budgetId) return;

    try {
      // Calculate monthly date range
      const startDate = new Date(periodValue.year, periodValue.month - 1, 1);
      const endDate = new Date(periodValue.year, periodValue.month, 0, 23, 59, 59);

      const response = await fetch(
        `/api/app/transactions/scheduled?budgetId=${budgetId}&startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`
      );

      if (response.ok) {
        const data = await response.json();
        setScheduled(data.scheduledTransactions || []);
        setMonthStatus(data.monthStatus || "planning");
        setHasAllocations(data.hasAllocations ?? true);
      }
    } catch (error) {
      console.error("Error fetching scheduled transactions:", error);
    } finally {
      setIsLoading(false);
    }
  }, [budgetId, periodValue]);

  useEffect(() => {
    fetchScheduled();
  }, [fetchScheduled, refreshKey]);

  // Filter confirmed transactions
  const filteredConfirmed = confirmedTransactions.filter((t) => {
    const matchesSearch = !searchTerm ||
      (t.description?.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (t.category?.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (t.incomeSource?.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (t.account?.name.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesType = typeFilter === "all" || t.type === typeFilter;
    const matchesCategory = categoryFilter === "all" || t.categoryId === categoryFilter;
    const matchesAccount = accountFilter === "all" || t.accountId === accountFilter;
    return matchesSearch && matchesType && matchesCategory && matchesAccount;
  });

  // Sort by date descending
  const sortedConfirmed = [...filteredConfirmed].sort((a, b) =>
    parseLocalDate(b.date).getTime() - parseLocalDate(a.date).getTime()
  );

  // Date calculations for overdue items
  const today = new Date();
  const currentDay = today.getDate();
  const isCurrentMonth = today.getFullYear() === periodValue.year && today.getMonth() + 1 === periodValue.month;

  // Pending items
  const unpaidScheduled = scheduled.filter((s) => !s.isPaid);

  const hasContent = scheduled.length > 0 || confirmedTransactions.length > 0;

  if (isLoading) {
    return null;
  }

  return (
    <div className="rounded-lg border bg-card">
      {/* Header with Month Navigator */}
      <div className="flex items-center justify-end p-3 border-b">
        <PeriodNavigator
          type="month"
          value={periodValue}
          onChange={onPeriodChange}
        />
      </div>

      {/* Month Status Banner */}
      {monthStatus !== "active" && (
        <div className={cn(
          "flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-3 py-2 border-b",
          monthStatus === "closed"
            ? "bg-muted/50"
            : "bg-amber-50 dark:bg-amber-950/20"
        )}>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              {monthStatus === "closed" ? (
                <Lock className="h-4 w-4 text-muted-foreground" />
              ) : (
                <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
              )}
              <span className={cn(
                "text-sm",
                monthStatus === "closed"
                  ? "text-muted-foreground"
                  : "text-amber-700 dark:text-amber-400"
              )}>
                {monthStatus === "closed"
                  ? "Mês fechado"
                  : !hasAllocations
                    ? "Configure o planejamento para ver despesas recorrentes"
                    : confirmedTransactions.length > 0
                      ? "Suas despesas recorrentes não estão visíveis"
                      : "Inicie o mês para ver suas despesas recorrentes"
                }
              </span>
            </div>
            {monthStatus !== "closed" && confirmedTransactions.length > 0 && (
              <p className="text-xs text-muted-foreground mt-0.5 ml-6">
                {confirmedTransactions.length} transaç{confirmedTransactions.length === 1 ? "ão confirmada" : "ões confirmadas"}
              </p>
            )}
          </div>
          {monthStatus !== "closed" && (
            <div className="flex items-center gap-2 shrink-0">
              {hasAllocations && onStartMonth ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleStartMonth}
                  disabled={isStartingMonth}
                  className="gap-1.5"
                >
                  {isStartingMonth ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Rocket className="h-3.5 w-3.5" />
                  )}
                  Iniciar Mês
                </Button>
              ) : (
                <>
                  {onCopyPreviousMonth && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleCopyPreviousMonth}
                      disabled={isCopyingMonth}
                      className="gap-1.5"
                    >
                      {isCopyingMonth ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                      Copiar anterior
                    </Button>
                  )}
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/app/budget?year=${periodValue.year}&month=${periodValue.month}`}>
                      Ir para Planejamento
                    </Link>
                  </Button>
                </>
              )}
            </div>
          )}
        </div>
      )}

      <div>
          {/* Pending Section */}
          {unpaidScheduled.length > 0 && (
            <div>
              <div className="px-3 py-2 bg-amber-50 dark:bg-amber-950/20 border-y">
                <span className="text-xs font-medium text-amber-700 dark:text-amber-400 uppercase tracking-wide">
                  Pendentes
                </span>
              </div>
              <div className="divide-y">
                {unpaidScheduled.map((item) => {
                  const isOverdue = isCurrentMonth && item.dueDay < currentDay;
                  const isToday = isCurrentMonth && item.dueDay === currentDay;

                  return (
                    <div
                      key={item.id}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2",
                        isOverdue && "bg-red-50 dark:bg-red-950/20"
                      )}
                    >
                      <div className="flex items-center justify-center w-6">
                        {isOverdue ? (
                          <Clock className="h-4 w-4 text-red-500" />
                        ) : (
                          <span className="text-base">{item.icon || (item.type === "income" ? "💰" : "📋")}</span>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">
                            {item.name}
                          </span>
                          {isToday && (
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
                        item.type === "income" ? "text-green-600" : "text-red-600"
                      )}>
                        {item.type === "income" ? "+" : "-"}{formatCurrencyCompact(item.amount)}
                      </div>

                      <div className="flex items-center gap-1">
                        {onEdit && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => onEdit(item)}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Editar antes de confirmar</TooltipContent>
                          </Tooltip>
                        )}
                        {onConfirm && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-green-600 hover:text-green-700"
                                onClick={() => onConfirm(item)}
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Confirmar transação</TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Confirmed Section */}
          {sortedConfirmed.length > 0 && (
            <div>
              <div className="px-3 py-2 bg-green-50 dark:bg-green-950/20 border-y">
                <span className="text-xs font-medium text-green-700 dark:text-green-400 uppercase tracking-wide">
                  Efetivadas
                </span>
              </div>
              <div className="divide-y">
                {sortedConfirmed.map((transaction) => (
                  <div
                    key={transaction.id}
                    className="flex items-center gap-3 px-3 py-2"
                  >
                    <div className="flex items-center justify-center w-6">
                      {transaction.type === "transfer" ? (
                        <ArrowLeftRight className="h-4 w-4 text-blue-500" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm truncate">
                          {transaction.description || "Sem descrição"}
                        </span>
                        {transaction.isInstallment && transaction.installmentNumber && transaction.totalInstallments && (
                          <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded flex-shrink-0">
                            {transaction.installmentNumber}/{transaction.totalInstallments}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{format(parseLocalDate(transaction.date), "dd/MMM", { locale: ptBR })}</span>
                        {transaction.type === "income" && transaction.incomeSource ? (
                          <span className="flex items-center gap-1">
                            {transaction.incomeSource.type === "salary" ? "💼" : transaction.incomeSource.type === "benefit" ? "🎁" : transaction.incomeSource.type === "freelance" ? "💻" : transaction.incomeSource.type === "rental" ? "🏠" : transaction.incomeSource.type === "investment" ? "📈" : "📦"} {transaction.incomeSource.name}
                          </span>
                        ) : transaction.category && (
                          <span className="flex items-center gap-1">
                            {transaction.category.icon || "📌"} {transaction.category.name}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className={cn(
                      "font-medium tabular-nums text-sm",
                      transaction.type === "income" ? "text-green-600" :
                      transaction.type === "expense" ? "text-red-600" : "text-blue-600"
                    )}>
                      {transaction.type === "expense" && "-"}
                      {transaction.type === "income" && "+"}
                      {formatCurrencyCompact(Math.abs(transaction.amount))}
                    </div>

                    <div className="flex items-center gap-1">
                      {onEditConfirmed && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => onEditConfirmed(transaction)}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Editar transação</TooltipContent>
                        </Tooltip>
                      )}
                      {onDeleteConfirmed && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className={cn(
                                "h-7 w-7",
                                transaction.recurringBillId || transaction.incomeSourceId
                                  ? "text-amber-600 hover:text-amber-700"
                                  : "text-destructive hover:text-destructive"
                              )}
                              onClick={() => onDeleteConfirmed(transaction)}
                            >
                              {transaction.recurringBillId || transaction.incomeSourceId
                                ? <Undo2 className="h-3.5 w-3.5" />
                                : <Trash2 className="h-3.5 w-3.5" />}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            {transaction.recurringBillId || transaction.incomeSourceId
                              ? "Desfazer confirmação"
                              : "Excluir transação"}
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        {/* Empty State */}
        {!hasContent && (
          <div className="p-6 text-center text-muted-foreground">
            <p className="text-sm">Nenhuma transação neste período</p>
          </div>
        )}
      </div>
    </div>
  );
}
