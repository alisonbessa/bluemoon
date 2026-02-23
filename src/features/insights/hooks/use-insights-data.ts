"use client";

import useSWR from "swr";
import type { InsightsData } from "../types";

export function useInsightsData(
  budgetId: string | null,
  year: number,
  month: number
) {
  const key = budgetId
    ? `/api/app/dashboard/insights?budgetId=${budgetId}&year=${year}&month=${month}`
    : null;

  const { data, isLoading, error } = useSWR<InsightsData>(key);

  return {
    data: data ?? null,
    isLoading,
    error,
  };
}
