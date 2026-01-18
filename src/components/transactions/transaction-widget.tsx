"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { formatCurrencyCompact, parseLocalDate } from "@/lib/formatters";
import {
  Calendar,
  CheckCircle2,
  Clock,
  ChevronDown,
  ChevronUp,
  Pencil,
  ArrowLeftRight,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

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
  accountId: string;
  status: string;
  isInstallment?: boolean;
  installmentNumber?: number | null;
  totalInstallments?: number | null;
  account?: { id: string; name: string; icon?: string | null } | null;
  category?: { id: string; name: string; icon?: string | null } | null;
}

interface TransactionWidgetProps {
  budgetId: string;
  year: number;
  month: number;
  refreshKey?: number;
  confirmedTransactions: ConfirmedTransaction[];
  searchTerm?: string;
  typeFilter?: string;
  onConfirm?: (transaction: ScheduledTransaction) => void;
  onEdit?: (transaction: ScheduledTransaction) => void;
  onEditConfirmed?: (transaction: ConfirmedTransaction) => void;
  onDeleteConfirmed?: (transaction: ConfirmedTransaction) => void;
}

export function TransactionWidget({
  budgetId,
  year,
  month,
  refreshKey,
  confirmedTransactions,
  searchTerm = "",
  typeFilter = "all",
  onConfirm,
  onEdit,
  onEditConfirmed,
  onDeleteConfirmed,
}: TransactionWidgetProps) {
  const [scheduled, setScheduled] = useState<ScheduledTransaction[]>([]);
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

  // Filter confirmed transactions
  const filteredConfirmed = confirmedTransactions.filter((t) => {
    const matchesSearch = !searchTerm ||
      (t.description?.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (t.category?.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (t.account?.name.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesType = typeFilter === "all" || t.type === typeFilter;
    return matchesSearch && matchesType;
  });

  // Sort by date descending
  const sortedConfirmed = [...filteredConfirmed].sort((a, b) =>
    parseLocalDate(b.date).getTime() - parseLocalDate(a.date).getTime()
  );

  // Date calculations for overdue items
  const today = new Date();
  const currentDay = today.getDate();
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() + 1 === month;

  // Pending items
  const unpaidScheduled = scheduled.filter((s) => !s.isPaid);
  const overdueCount = unpaidScheduled.filter(
    (s) => isCurrentMonth && s.type === "expense" && s.dueDay < currentDay
  ).length;

  const hasContent = scheduled.length > 0 || confirmedTransactions.length > 0;

  if (isLoading) {
    return null;
  }

  return (
    <div className="rounded-lg border bg-card">
      {/* Header */}
      <button
        className="flex items-center justify-between w-full p-3 hover:bg-muted/50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-primary" />
          <span className="font-semibold">Transações do Mês</span>
          {overdueCount > 0 && (
            <span className="px-2 py-0.5 text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 rounded-full">
              {overdueCount} atrasada{overdueCount > 1 ? "s" : ""}
            </span>
          )}
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-4 text-sm">
            {unpaidScheduled.length > 0 && (
              <span className="text-muted-foreground">
                {unpaidScheduled.length} pendente{unpaidScheduled.length !== 1 ? "s" : ""}
              </span>
            )}
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
                        {transaction.category && (
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
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => onEditConfirmed(transaction)}
                          title="Editar transação"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      {onDeleteConfirmed && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => onDeleteConfirmed(transaction)}
                          title="Excluir transação"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
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
              <p className="text-sm">Nenhuma transação neste mês</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
