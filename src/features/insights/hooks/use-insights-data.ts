"use client";

import useSWR from "swr";
import { useViewMode } from "@/shared/providers/view-mode-provider";
import type { InsightsData } from "../types";

export function useInsightsData(
  budgetId: string | null,
  year: number,
  month: number
) {
  const { viewMode, isDuoPlan } = useViewMode();
  const vm = isDuoPlan ? `&viewMode=${viewMode}` : '';

  const key = budgetId
    ? `/api/app/dashboard/insights?budgetId=${budgetId}&year=${year}&month=${month}${vm}`
    : null;

  const { data, isLoading, error } = useSWR<InsightsData>(key);

  return {
    data: data ?? null,
    isLoading,
    error,
  };
}
