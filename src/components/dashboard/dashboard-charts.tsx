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
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { formatCurrency as formatCurrencyBase } from "@/lib/formatters";

// Chart-specific currency formatter (no decimals for cleaner display)
const formatCurrency = (cents: number) => formatCurrencyBase(cents, { decimals: 0 });

interface DailyData {
  day: number;
  date: string;
  income: number;
  expense: number;
  balance: number;
  pendingIncome?: number;
  pendingExpense?: number;
  pendingBalance?: number;
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

const dailyChartConfig = {
  income: {
    label: "Receitas",
    color: "hsl(142, 76%, 36%)",
  },
  expenseNegative: {
    label: "Despesas",
    color: "hsl(0, 84%, 60%)",
  },
  balance: {
    label: "Saldo Realizado",
    color: "hsl(221, 83%, 53%)",
  },
  pendingIncome: {
    label: "Receitas Pendentes",
    color: "hsl(142, 76%, 36%)",
  },
  pendingExpenseNegative: {
    label: "Despesas Pendentes",
    color: "hsl(0, 84%, 60%)",
  },
  pendingBalance: {
    label: "Saldo Projetado",
    color: "hsl(221, 83%, 53%)",
  },
};

const monthlyChartConfig = {
  income: {
    label: "Receitas",
    color: "hsl(142, 76%, 36%)",
  },
  expenseNegative: {
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
  const [showPending, setShowPending] = useState(false);

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

  // Transform daily data to have negative expenses for stacked bar effect
  const transformedDailyData = dailyData.map((item) => ({
    ...item,
    expenseNegative: -item.expense,
    pendingExpenseNegative: -(item.pendingExpense || 0),
  }));

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
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Saldo Diário</CardTitle>
              <CardDescription>
                Receitas, despesas e saldo acumulado do mês
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="show-pending"
                checked={showPending}
                onCheckedChange={setShowPending}
              />
              <Label htmlFor="show-pending" className="text-sm text-muted-foreground">
                Mostrar pendentes
              </Label>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ChartContainer config={dailyChartConfig} className="h-[300px] w-full">
            <ComposedChart
              data={transformedDailyData}
              margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
              stackOffset="sign"
            >
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
                tickFormatter={(value) => formatCurrency(Math.abs(value))}
                width={70}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    labelFormatter={(label) => `Dia ${label}`}
                    formatter={(value, name, item) => {
                      const config = dailyChartConfig[item.dataKey as keyof typeof dailyChartConfig];
                      return (
                        <>
                          <span className="text-muted-foreground">{config?.label || name}</span>
                          <span className="ml-auto font-mono font-medium">
                            {formatCurrency(Math.abs(Number(value)))}
                          </span>
                        </>
                      );
                    }}
                  />
                }
              />
              <Bar
                dataKey="income"
                fill="var(--color-income)"
                radius={[4, 4, 0, 0]}
                stackId="stack"
              />
              {showPending && (
                <Bar
                  dataKey="pendingIncome"
                  fill="var(--color-pendingIncome)"
                  radius={[4, 4, 0, 0]}
                  stackId="stack"
                  fillOpacity={0.3}
                />
              )}
              <Bar
                dataKey="expenseNegative"
                fill="var(--color-expenseNegative)"
                radius={[0, 0, 4, 4]}
                stackId="stack"
              />
              {showPending && (
                <Bar
                  dataKey="pendingExpenseNegative"
                  fill="var(--color-pendingExpenseNegative)"
                  radius={[0, 0, 4, 4]}
                  stackId="stack"
                  fillOpacity={0.3}
                />
              )}
              <Line
                type="monotone"
                dataKey="balance"
                stroke="var(--color-balance)"
                strokeWidth={2}
                dot={false}
              />
              {showPending && (
                <Line
                  type="monotone"
                  dataKey="pendingBalance"
                  stroke="var(--color-pendingBalance)"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={false}
                />
              )}
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
              <SelectTrigger className="w-[160px]">
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
                    labelFormatter={(label) => `${label}`}
                    formatter={(value, name, item) => {
                      const config = monthlyChartConfig[item.dataKey as keyof typeof monthlyChartConfig];
                      return (
                        <>
                          <span className="text-muted-foreground">{config?.label || name}</span>
                          <span className="ml-auto font-mono font-medium">
                            {formatCurrency(Math.abs(Number(value)))}
                          </span>
                        </>
                      );
                    }}
                  />
                }
              />
              <Bar
                dataKey="income"
                fill="var(--color-income)"
                radius={[4, 4, 0, 0]}
                stackId="stack"
              />
              <Bar
                dataKey="expenseNegative"
                fill="var(--color-expenseNegative)"
                radius={[0, 0, 4, 4]}
                stackId="stack"
              />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  );
}
