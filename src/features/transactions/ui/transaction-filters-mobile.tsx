"use client";

import { Search, SlidersHorizontal } from "lucide-react";
import { Input } from "@/shared/ui/input";
import { Button } from "@/shared/ui/button";
import { FilterChips } from "@/shared/ui/filter-chips";
import type { FilterChip } from '../types';

interface TransactionFiltersMobileProps {
  // Search
  searchTerm: string;
  onSearchChange: (value: string) => void;
  // Filter sheet
  onOpenFilters: () => void;
  // Filter chips
  filterChips: FilterChip[];
  onRemoveFilter: (key: string) => void;
  onClearAll: () => void;
}

export function TransactionFiltersMobile({
  searchTerm,
  onSearchChange,
  onOpenFilters,
  filterChips,
  onRemoveFilter,
  onClearAll,
}: TransactionFiltersMobileProps) {
  return (
    <div className="flex sm:hidden flex-col gap-2">
      <div className="flex items-center gap-2">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar..."
            className="pl-10 h-9"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>

        {/* Filters Button */}
        <Button
          variant="outline"
          size="sm"
          className="h-9"
          onClick={onOpenFilters}
        >
          <SlidersHorizontal className="h-4 w-4 mr-2" />
          Filtros
        </Button>
      </div>

      {/* Filter Chips */}
      <FilterChips
        chips={filterChips}
        onRemove={onRemoveFilter}
        onClearAll={onClearAll}
      />
    </div>
  );
}
