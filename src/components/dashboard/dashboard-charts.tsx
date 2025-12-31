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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

type PeriodFilter = "3months" | "6months" | "12months" | "thisYear";

export function DashboardCharts({
  dailyData,
  monthlyData,
  isLoading,
}: DashboardChartsProps) {
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>("12months");

  // Filter monthly data based on selected period
  const getFilteredMonthlyData = () => {
    const now = new Date();
    const currentYear = now.getFullYear();

    switch (periodFilter) {
      case "thisYear":
        // Filter to show only months from the current year
        return monthlyData.filter((item) => item.year === currentYear);
      case "3months":
        // Show last 3 months from the data
        return monthlyData.slice(-3);
      case "6months":
        // Show last 6 months from the data
        return monthlyData.slice(-6);
      case "12months":
      default:
        // Show all data from API (last 12 months)
        return monthlyData;
    }
  };

  const filteredMonthlyData = getFilteredMonthlyData();

  // Transform monthly data to have negative expenses for stacked bar effect
  const transformedMonthlyData = filteredMonthlyData.map((item) => ({
    ...item,
    expenseNegative: -item.expense,
  }));

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-[300px]" />
        <Skeleton className="h-[300px]" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
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
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Comparativo Mensal</CardTitle>
              <CardDescription>
                Receitas e despesas por período
              </CardDescription>
            </div>
            <Select value={periodFilter} onValueChange={(value: PeriodFilter) => setPeriodFilter(value)}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="3months">Últimos 3 meses</SelectItem>
                <SelectItem value="6months">Últimos 6 meses</SelectItem>
                <SelectItem value="12months">Últimos 12 meses</SelectItem>
                <SelectItem value="thisYear">Este ano</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <ChartContainer config={monthlyChartConfig} className="h-[300px] w-full">
            <BarChart
              data={transformedMonthlyData}
              margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
              stackOffset="sign"
            >
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => formatCurrency(Math.abs(value))}
                width={70}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    formatter={(value, name) => (
                      <span className="font-medium">
                        {formatCurrency(Math.abs(Number(value)))}
                      </span>
                    )}
                    labelFormatter={(label) => `${label}`}
                  />
                }
              />
              <Bar
                dataKey="income"
                fill="var(--color-income)"
                radius={[4, 4, 0, 0]}
                name="Receitas"
                stackId="stack"
              />
              <Bar
                dataKey="expenseNegative"
                fill="var(--color-expense)"
                radius={[0, 0, 4, 4]}
                name="Despesas"
                stackId="stack"
              />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  );
}
