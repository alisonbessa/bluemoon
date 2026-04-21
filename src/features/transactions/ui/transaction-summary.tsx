"use client";

import { TrendingUp, TrendingDown, Receipt } from "lucide-react";
import { formatCurrency } from "@/shared/lib/formatters";
import { SummaryCardGrid } from "@/shared/organisms";

interface TransactionSummaryProps {
  income: number;
  expenses: number;
  totalIncome?: number;
  totalExpenses?: number;
}

export function TransactionSummary({ income, expenses, totalIncome, totalExpenses }: TransactionSummaryProps) {
  const balance = income - expenses;
  const totalBalance = (totalIncome ?? income) - (totalExpenses ?? expenses);
  const hasUnconfirmed = (totalIncome !== undefined && totalIncome !== income) ||
    (totalExpenses !== undefined && totalExpenses !== expenses);

  return (
    <SummaryCardGrid
      items={[
        {
          id: "income",
          icon: <TrendingUp className="h-full w-full text-green-500" />,
          label: "Receitas",
          value: formatCurrency(income),
          subtitle: hasUnconfirmed && totalIncome !== undefined && totalIncome > income
            ? `A receber: ${formatCurrency(totalIncome - income)}`
            : undefined,
          valueColor: "positive",
        },
        {
          id: "expenses",
          icon: <TrendingDown className="h-full w-full text-red-500" />,
          label: "Despesas",
          value: formatCurrency(expenses),
          subtitle: hasUnconfirmed && totalExpenses !== undefined && totalExpenses > expenses
            ? `A pagar: ${formatCurrency(totalExpenses - expenses)}`
            : undefined,
          valueColor: "negative",
        },
        {
          id: "balance",
          icon: <Receipt className="h-full w-full" />,
          label: "Saldo",
          value: formatCurrency(balance),
          subtitle: hasUnconfirmed
            ? `Previsto: ${formatCurrency(totalBalance)}`
            : undefined,
          valueColor: balance >= 0 ? "positive" : "negative",
        },
      ]}
    />
  );
}
