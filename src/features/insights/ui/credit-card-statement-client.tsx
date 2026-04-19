"use client";

import { useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/ui/card";
import { Skeleton } from "@/shared/ui/skeleton";
import { MonthSelector } from "@/shared/ui/month-selector";
import { formatCurrency } from "@/shared/lib/formatters";
import { ArrowLeftIcon, CreditCardIcon } from "lucide-react";
import { Button } from "@/shared/ui/button";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/shared/ui/breadcrumb";

interface StatementTransaction {
  id: string;
  amount: number;
  description: string | null;
  date: string;
  status: string;
  isInstallment: boolean;
  installmentNumber: number | null;
  totalInstallments: number | null;
  category: {
    id: string;
    name: string;
    icon: string | null;
  } | null;
}

interface StatementResponse {
  account: {
    id: string;
    name: string;
    icon: string | null;
    closingDay: number;
    dueDay: number | null;
    creditLimit: number | null;
  };
  cycle: {
    year: number;
    month: number;
    start: string;
    end: string;
  };
  transactions: StatementTransaction[];
  total: number;
}

interface CreditCardStatementClientProps {
  accountId: string;
  initialYear: number;
  initialMonth: number;
}

export function CreditCardStatementClient({
  accountId,
  initialYear,
  initialMonth,
}: CreditCardStatementClientProps) {
  const [year, setYear] = useState(initialYear);
  const [month, setMonth] = useState(initialMonth);

  const { data, isLoading } = useSWR<StatementResponse>(
    `/api/app/accounts/${accountId}/statement?year=${year}&month=${month}`
  );

  const handleMonthChange = (newYear: number, newMonth: number) => {
    setYear(newYear);
    setMonth(newMonth);
  };

  const monthNames = ["janeiro", "fevereiro", "marco", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return `${d.getDate().toString().padStart(2, "0")}/${(d.getMonth() + 1).toString().padStart(2, "0")}`;
  };

  const cycleLabel = data
    ? `${formatDate(data.cycle.start)} a ${formatDate(data.cycle.end)}`
    : "";

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/app/insights">Relatórios</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>
              {isLoading ? "Fatura" : `Fatura ${data?.account.name ?? ""}`}
            </BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild aria-label="Voltar para relatórios">
          <Link href="/app/insights">
            <ArrowLeftIcon className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-xl font-semibold flex items-center gap-2">
            <CreditCardIcon className="h-5 w-5" aria-hidden="true" />
            {isLoading ? (
              <Skeleton className="h-6 w-40" />
            ) : (
              <>
                <span aria-hidden="true">{data?.account.icon || "💳"}</span>{" "}
                Fatura {data?.account.name}
              </>
            )}
          </h1>
          {cycleLabel && (
            <p className="text-sm text-muted-foreground mt-0.5">
              Ciclo: {cycleLabel}
              {data?.account.dueDay && (
                <> · Vencimento dia {data.account.dueDay}</>
              )}
            </p>
          )}
        </div>
        <MonthSelector
          year={year}
          month={month}
          onChange={handleMonthChange}
        />
      </div>

      {/* Summary */}
      {isLoading ? (
        <Skeleton className="h-20" />
      ) : data ? (
        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardContent className="pt-4 pb-4">
              <p className="text-sm text-muted-foreground">Total da fatura</p>
              <p className="text-2xl font-bold text-destructive tabular-nums">
                {formatCurrency(data.total)}
              </p>
            </CardContent>
          </Card>
          {data.account.creditLimit != null && data.account.creditLimit > 0 && (
            <Card>
              <CardContent className="pt-4 pb-4">
                <p className="text-sm text-muted-foreground">Limite disponivel</p>
                <p className="text-2xl font-bold tabular-nums">
                  {formatCurrency(data.account.creditLimit - data.total)}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      ) : null}

      {/* Transactions list */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">
            Lancamentos ({data?.transactions.length ?? 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12" />
              ))}
            </div>
          ) : data && data.transactions.length > 0 ? (
            <div className="divide-y">
              {data.transactions.map((tx) => (
                <div key={tx.id} className="flex items-center gap-3 py-3">
                  <span className="text-lg w-7 text-center shrink-0">
                    {tx.category?.icon || "📁"}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {tx.description || tx.category?.name || "Despesa"}
                      {tx.isInstallment && tx.installmentNumber && tx.totalInstallments && (
                        <span className="text-muted-foreground font-normal">
                          {" "}({tx.installmentNumber}/{tx.totalInstallments})
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(tx.date)}
                      {tx.category?.name && <> · {tx.category.name}</>}
                    </p>
                  </div>
                  <span className="text-sm font-semibold tabular-nums text-red-600 shrink-0">
                    {formatCurrency(Math.abs(tx.amount))}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">
              Nenhum lancamento nesta fatura
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
