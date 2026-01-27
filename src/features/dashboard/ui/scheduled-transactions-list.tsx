"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/shared/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/ui/card";
import { Skeleton } from "@/shared/ui/skeleton";
import {
  Calendar,
  CheckCircle2,
  Clock,
  ArrowRightIcon,
  Check,
  Loader2,
} from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { formatCurrencyCompact } from "@/shared/lib/formatters";
import Link from "next/link";
import { toast } from "sonner";

interface ScheduledTransaction {
  id: string;
  type: "expense" | "income";
  name: string;
  icon?: string | null;
  amount: number;
  dueDay: number;
  dueDate: string;
  isPaid: boolean;
  sourceType: "recurring_bill" | "income_source" | "goal";
  sourceId: string;
  categoryId?: string;
  incomeSourceId?: string;
  goalId?: string;
  recurringBillId?: string;
}

interface Account {
  id: string;
  name: string;
}

interface ScheduledTransactionsListProps {
  budgetId: string;
  year: number;
  month: number;
  refreshKey?: number;
}

export function ScheduledTransactionsList({
  budgetId,
  year,
  month,
  refreshKey,
}: ScheduledTransactionsListProps) {
  const [scheduled, setScheduled] = useState<ScheduledTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

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

  // Fetch accounts for the budget
  const fetchAccounts = useCallback(async () => {
    if (!budgetId) return;

    try {
      const response = await fetch(`/api/app/accounts?budgetId=${budgetId}`);
      if (response.ok) {
        const data = await response.json();
        setAccounts(data.accounts || []);
      }
    } catch (error) {
      console.error("Error fetching accounts:", error);
    }
  }, [budgetId]);

  useEffect(() => {
    fetchScheduled();
    fetchAccounts();
  }, [fetchScheduled, fetchAccounts, refreshKey]);

  // Confirm a scheduled transaction
  const handleConfirm = async (item: ScheduledTransaction) => {
    if (accounts.length === 0) {
      toast.error("Nenhuma conta encontrada. Crie uma conta primeiro.");
      return;
    }

    // Use the first account as default
    const defaultAccount = accounts[0];

    setConfirmingId(item.id);

    try {
      const response = await fetch("/api/app/transactions/confirm-scheduled", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          budgetId,
          type: item.type,
          amount: item.amount,
          description: item.name,
          accountId: defaultAccount.id,
          categoryId: item.categoryId,
          incomeSourceId: item.incomeSourceId,
          recurringBillId: item.recurringBillId,
          date: item.dueDate,
        }),
      });

      if (response.ok) {
        toast.success("Transação confirmada!");
        // Refresh the list
        fetchScheduled();
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || "Erro ao confirmar transação");
      }
    } catch (error) {
      console.error("Error confirming transaction:", error);
      toast.error("Erro ao confirmar transação");
    } finally {
      setConfirmingId(null);
    }
  };

  const today = new Date();
  const currentDay = today.getDate();
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() + 1 === month;

  // Filter to show only unpaid transactions, limited to 5
  const unpaidTransactions = scheduled.filter((s) => !s.isPaid).slice(0, 5);
  const totalUnpaid = scheduled.filter((s) => !s.isPaid).length;

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Transações Agendadas
        </CardTitle>
        <CardDescription>
          Contas a pagar e receber neste mês
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col flex-1">
        {isLoading ? (
          <div className="flex flex-col gap-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-11 w-full" />
            ))}
          </div>
        ) : unpaidTransactions.length > 0 ? (
          <div className="flex flex-col flex-1">
            <div className="flex-1 space-y-0">
              {unpaidTransactions.map((item) => {
                const isOverdue = isCurrentMonth && !item.isPaid && item.dueDay < currentDay;
                const isToday = isCurrentMonth && item.dueDay === currentDay;
                const isConfirming = confirmingId === item.id;

                return (
                  <div
                    key={item.id}
                    className={cn(
                      "py-3 space-y-1",
                      isOverdue && "text-red-600 dark:text-red-400"
                    )}
                  >
                    <div className="flex justify-between items-center text-sm gap-2">
                      <span className="flex items-center gap-1.5 min-w-0 flex-1">
                        {isOverdue ? (
                          <Clock className="h-4 w-4 text-red-500 shrink-0" />
                        ) : (
                          <span className="shrink-0">{item.icon || (item.type === "income" ? "💰" : "📋")}</span>
                        )}
                        <span className="font-medium truncate">{item.name}</span>
                        {isToday && (
                          <span className="px-1.5 py-0.5 text-[10px] font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 rounded shrink-0">
                            HOJE
                          </span>
                        )}
                      </span>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={cn(
                          "font-medium tabular-nums",
                          item.type === "income" ? "text-green-600" : "text-red-600"
                        )}>
                          {item.type === "income" ? "+" : "-"}{formatCurrencyCompact(item.amount)}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-950"
                          onClick={() => handleConfirm(item)}
                          disabled={isConfirming}
                          title="Confirmar transação"
                        >
                          {isConfirming ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Check className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Dia {item.dueDay} • {item.type === "income" ? "Receita" : "Despesa"}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-auto pt-3">
              <Button asChild variant="ghost" size="sm" className="w-full">
                <Link href="/app/transactions">
                  Ver {totalUnpaid > 5 ? `todas as ${totalUnpaid} pendentes` : "mais"}
                  <ArrowRightIcon className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-4 text-center flex-1">
            <CheckCircle2 className="h-10 w-10 text-green-500 mb-2" />
            <p className="text-sm text-muted-foreground">
              Todas as contas do mês estão em dia!
            </p>
            <div className="mt-auto pt-3">
              <Button asChild variant="ghost" size="sm">
                <Link href="/app/transactions">
                  Ver transações
                  <ArrowRightIcon className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
