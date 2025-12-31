"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  Bar,
  BarChart,
  Line,
  ComposedChart,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Skeleton } from "@/components/ui/skeleton";

interface DailyData {
  day: number;
  date: string;
  income: number;
  expense: number;
  balance: number;
}

interface MonthlyData {
  month: string;
  year: number;
  label: string;
  income: number;
  expense: number;
}

interface DashboardChartsProps {
  dailyData: DailyData[];
  monthlyData: MonthlyData[];
  isLoading?: boolean;
}

function formatCurrency(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

const dailyChartConfig = {
  income: {
    label: "Receitas",
    color: "hsl(142, 76%, 36%)",
  },
  expense: {
    label: "Despesas",
    color: "hsl(0, 84%, 60%)",
  },
  balance: {
    label: "Saldo",
    color: "hsl(221, 83%, 53%)",
  },
};

const monthlyChartConfig = {
  income: {
    label: "Receitas",
    color: "hsl(142, 76%, 36%)",
  },
  expense: {
    label: "Despesas",
    color: "hsl(0, 84%, 60%)",
  },
};

export function DashboardCharts({
  dailyData,
  monthlyData,
  isLoading,
}: DashboardChartsProps) {
  if (isLoading) {
    return (
      <div className="grid gap-6 md:grid-cols-2">
        <Skeleton className="h-[300px]" />
        <Skeleton className="h-[300px]" />
      </div>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* Daily Balance Chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Saldo Diario</CardTitle>
          <CardDescription>
            Receitas, despesas e saldo acumulado do mes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={dailyChartConfig} className="h-[250px] w-full">
            <ComposedChart data={dailyData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => formatCurrency(value)}
                width={60}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    formatter={(value, name) => (
                      <span className="font-medium">
                        {formatCurrency(Number(value))}
                      </span>
                    )}
                  />
                }
              />
              <Bar
                dataKey="income"
                fill="var(--color-income)"
                radius={[2, 2, 0, 0]}
                name="Receitas"
              />
              <Bar
                dataKey="expense"
                fill="var(--color-expense)"
                radius={[2, 2, 0, 0]}
                name="Despesas"
              />
              <Line
                type="monotone"
                dataKey="balance"
                stroke="var(--color-balance)"
                strokeWidth={2}
                dot={false}
                name="Saldo"
              />
            </ComposedChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Monthly Comparison Chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Comparativo Mensal</CardTitle>
          <CardDescription>
            Receitas e despesas dos ultimos 6 meses
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={monthlyChartConfig} className="h-[250px] w-full">
            <BarChart data={monthlyData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => formatCurrency(value)}
                width={60}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    formatter={(value, name) => (
                      <span className="font-medium">
                        {formatCurrency(Number(value))}
                      </span>
                    )}
                  />
                }
              />
              <Bar
                dataKey="income"
                fill="var(--color-income)"
                radius={[2, 2, 0, 0]}
                name="Receitas"
              />
              <Bar
                dataKey="expense"
                fill="var(--color-expense)"
                radius={[2, 2, 0, 0]}
                name="Despesas"
              />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  );
}
