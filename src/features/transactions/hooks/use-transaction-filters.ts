"use client";

import { useState, useMemo, useCallback } from "react";
import type { Category, Account, FilterChip, TypeFilter } from "../types";
import { TYPE_FILTER_LABELS } from "../types";

interface UseTransactionFiltersOptions {
  categories: Category[];
  accounts: Account[];
}

interface UseTransactionFiltersReturn {
  // Filter states
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  typeFilter: TypeFilter;
  setTypeFilter: (value: TypeFilter) => void;
  categoryFilter: string;
  setCategoryFilter: (value: string) => void;
  accountFilter: string;
  setAccountFilter: (value: string) => void;
  // Filter sheet (mobile)
  isFilterSheetOpen: boolean;
  setIsFilterSheetOpen: (value: boolean) => void;
  // Computed
  filterChips: FilterChip[];
  hasActiveFilters: boolean;
  // Actions
  clearAllFilters: () => void;
  handleRemoveFilter: (key: string) => void;
}

export function useTransactionFilters(
  options: UseTransactionFiltersOptions
): UseTransactionFiltersReturn {
  const { categories, accounts } = options;

  // Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [accountFilter, setAccountFilter] = useState("all");
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);

  // Build filter chips for active filters
  const filterChips = useMemo(() => {
    const chips: FilterChip[] = [];

    if (typeFilter !== "all") {
      chips.push({
        key: "type",
        label: TYPE_FILTER_LABELS[typeFilter],
        value: typeFilter,
      });
    }

    if (categoryFilter !== "all") {
      const category = categories.find((c) => c.id === categoryFilter);
      if (category) {
        chips.push({
          key: "category",
          label: category.name,
          value: categoryFilter,
        });
      }
    }

    if (accountFilter !== "all") {
      const account = accounts.find((a) => a.id === accountFilter);
      if (account) {
        chips.push({
          key: "account",
          label: account.name,
          value: accountFilter,
        });
      }
    }

    if (searchTerm) {
      chips.push({
        key: "search",
        label: `"${searchTerm}"`,
        value: searchTerm,
      });
    }

    return chips;
  }, [typeFilter, categoryFilter, accountFilter, searchTerm, categories, accounts]);

  const hasActiveFilters = filterChips.length > 0;

  const clearAllFilters = useCallback(() => {
    setTypeFilter("all");
    setCategoryFilter("all");
    setAccountFilter("all");
    setSearchTerm("");
  }, []);

  const handleRemoveFilter = useCallback((key: string) => {
    switch (key) {
      case "type":
        setTypeFilter("all");
        break;
      case "category":
        setCategoryFilter("all");
        break;
      case "account":
        setAccountFilter("all");
        break;
      case "search":
        setSearchTerm("");
        break;
    }
  }, []);

  return {
    // Filter states
    searchTerm,
    setSearchTerm,
    typeFilter,
    setTypeFilter,
    categoryFilter,
    setCategoryFilter,
    accountFilter,
    setAccountFilter,
    // Filter sheet (mobile)
    isFilterSheetOpen,
    setIsFilterSheetOpen,
    // Computed
    filterChips,
    hasActiveFilters,
    // Actions
    clearAllFilters,
    handleRemoveFilter,
  };
}
