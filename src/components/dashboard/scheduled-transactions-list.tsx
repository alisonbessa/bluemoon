"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Calendar,
  CheckCircle2,
  Clock,
  ArrowRightIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCurrencyCompact } from "@/lib/formatters";
import Link from "next/link";

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

                return (
                  <div
                    key={item.id}
                    className={cn(
                      "py-3 space-y-1",
                      isOverdue && "text-red-600 dark:text-red-400"
                    )}
                  >
                    <div className="flex justify-between text-sm">
                      <span className="flex items-center gap-1.5">
                        {isOverdue ? (
                          <Clock className="h-4 w-4 text-red-500" />
                        ) : (
                          <span>{item.icon || (item.type === "income" ? "💰" : "📋")}</span>
                        )}
                        <span className="font-medium">{item.name}</span>
                        {isToday && (
                          <span className="px-1.5 py-0.5 text-[10px] font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 rounded">
                            HOJE
                          </span>
                        )}
                      </span>
                      <span className={cn(
                        "font-medium tabular-nums",
                        item.type === "income" ? "text-green-600" : "text-red-600"
                      )}>
                        {item.type === "income" ? "+" : "-"}{formatCurrencyCompact(item.amount)}
                      </span>
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
