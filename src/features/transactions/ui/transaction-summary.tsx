"use client";

import { TrendingUp, TrendingDown, Receipt } from "lucide-react";
import { formatCurrency } from "@/shared/lib/formatters";
import { SummaryCardGrid } from "@/shared/organisms";

interface TransactionSummaryProps {
  income: number;
  expenses: number;
}

export function TransactionSummary({ income, expenses }: TransactionSummaryProps) {
  const balance = income - expenses;

  return (
    <SummaryCardGrid
      items={[
        {
          id: "income",
          icon: <TrendingUp className="h-full w-full text-green-500" />,
          label: "Receitas",
          value: formatCurrency(income),
          valueColor: "positive",
        },
        {
          id: "expenses",
          icon: <TrendingDown className="h-full w-full text-red-500" />,
          label: "Despesas",
          value: formatCurrency(expenses),
          valueColor: "negative",
        },
        {
          id: "balance",
          icon: <Receipt className="h-full w-full" />,
          label: "Saldo",
          value: formatCurrency(balance),
          valueColor: balance >= 0 ? "positive" : "negative",
        },
      ]}
    />
  );
}
