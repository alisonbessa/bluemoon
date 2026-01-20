"use client";

import { Search } from "lucide-react";
import { Input } from "@/shared/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import { FilterChips } from "@/shared/ui/filter-chips";
import type { Category, Account, TypeFilter, FilterChip } from '../types';

interface TransactionFiltersBarProps {
  // Filter values
  searchTerm: string;
  onSearchChange: (value: string) => void;
  typeFilter: TypeFilter;
  onTypeFilterChange: (value: TypeFilter) => void;
  categoryFilter: string;
  onCategoryFilterChange: (value: string) => void;
  accountFilter: string;
  onAccountFilterChange: (value: string) => void;
  // Data
  categories: Category[];
  accounts: Account[];
  // Filter chips
  filterChips: FilterChip[];
  onRemoveFilter: (key: string) => void;
  onClearAll: () => void;
}

export function TransactionFiltersBar({
  searchTerm,
  onSearchChange,
  typeFilter,
  onTypeFilterChange,
  categoryFilter,
  onCategoryFilterChange,
  accountFilter,
  onAccountFilterChange,
  categories,
  accounts,
  filterChips,
  onRemoveFilter,
  onClearAll,
}: TransactionFiltersBarProps) {
  return (
    <div className="hidden sm:flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        {/* Search Input */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar transações..."
            className="pl-10 h-9"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>

        {/* Type Filter */}
        <Select value={typeFilter} onValueChange={(v) => onTypeFilterChange(v as TypeFilter)}>
          <SelectTrigger className="w-[140px] h-9">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="income">Receitas</SelectItem>
            <SelectItem value="expense">Despesas</SelectItem>
            <SelectItem value="transfer">Transferências</SelectItem>
          </SelectContent>
        </Select>

        {/* Category Filter (hidden for transfers) */}
        {typeFilter !== "transfer" && (
          <Select value={categoryFilter} onValueChange={onCategoryFilterChange}>
            <SelectTrigger className="w-[160px] h-9">
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas categorias</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>
                  {cat.icon && <span className="mr-2">{cat.icon}</span>}
                  {cat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Account Filter */}
        <Select value={accountFilter} onValueChange={onAccountFilterChange}>
          <SelectTrigger className="w-[140px] h-9">
            <SelectValue placeholder="Conta" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas contas</SelectItem>
            {accounts.map((acc) => (
              <SelectItem key={acc.id} value={acc.id}>
                {acc.icon && <span className="mr-2">{acc.icon}</span>}
                {acc.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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
