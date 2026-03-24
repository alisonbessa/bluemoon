"use client";

import { useState } from "react";
import { Skeleton } from "@/shared/ui/skeleton";
import { Alert, AlertDescription } from "@/shared/ui/alert";
import { MonthSelector } from "@/shared/ui/month-selector";
import { PageContent } from "@/shared/molecules";
import { PageTitle } from "@/shared/ui/typography";
import useSWR from "swr";
import {
  useInsightsData,
  InsightsCards,
  TopCategoriesList,
  MonthComparisonCard,
} from "@/features/insights";

interface BudgetsResponse {
  budgets: { id: string; name: string }[];
}

function InsightsSkeleton() {
  return (
    <PageContent>
      <div className="flex flex-col gap-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-64" />
      </div>
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-40" />
        ))}
      </div>
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
        <Skeleton className="h-64" />
        <Skeleton className="h-64" />
      </div>
      <Skeleton className="h-40" />
    </PageContent>
  );
}

export default function InsightsPageClient() {
  const today = new Date();
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth() + 1);

  const { data: budgetsData, isLoading: budgetsLoading } =
    useSWR<BudgetsResponse>("/api/app/budgets");
  const budgets = budgetsData?.budgets ?? [];
  const primaryBudgetId = budgets[0]?.id ?? null;

  const { data, isLoading: insightsLoading, error } = useInsightsData(
    primaryBudgetId,
    currentYear,
    currentMonth
  );

  const isLoading = budgetsLoading || insightsLoading;

  const handleMonthChange = (year: number, month: number) => {
    setCurrentYear(year);
    setCurrentMonth(month);
  };

  if (isLoading) {
    return <InsightsSkeleton />;
  }

  if (error) {
    return (
      <PageContent>
        <Alert variant="destructive">
          <AlertDescription>
            Erro ao carregar insights: {error.message}
          </AlertDescription>
        </Alert>
      </PageContent>
    );
  }

  if (!data) {
    return (
      <PageContent>
        <Alert>
          <AlertDescription>
            Nenhum dado disponível. Comece adicionando transações ao seu orçamento.
          </AlertDescription>
        </Alert>
      </PageContent>
    );
  }

  const monthNames = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
  ];

  return (
    <PageContent>
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div>
          <PageTitle className="text-xl sm:text-2xl">Relatórios</PageTitle>
          <p className="text-sm text-muted-foreground">
            Insights de {monthNames[currentMonth - 1]} de {currentYear}
          </p>
        </div>
        <MonthSelector
          year={currentYear}
          month={currentMonth}
          onChange={handleMonthChange}
          className="shrink-0"
        />
      </div>

      {/* Summary Cards */}
      <InsightsCards
        summary={data.summary}
        budgetHealth={data.budgetHealth}
        projection={data.projection}
        month={data.month}
      />

      {/* Top Categories & Over Budget */}
      <TopCategoriesList
        topCategories={data.topCategories}
        overBudgetCategories={data.overBudgetCategories}
      />

      {/* Month Comparison */}
      <MonthComparisonCard comparison={data.comparison} />
    </PageContent>
  );
}
