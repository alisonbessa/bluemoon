"use client";

import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { PeriodSelector, type PeriodType } from "@/components/ui/period-selector";
import type { DateRange } from "@/components/ui/date-range-picker";

interface Category {
  id: string;
  name: string;
  icon?: string | null;
}

interface Account {
  id: string;
  name: string;
  icon?: string | null;
}

interface TransactionFiltersSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // Filters - all apply immediately
  periodType: PeriodType;
  onPeriodTypeChange: (type: PeriodType) => void;
  typeFilter: string;
  onTypeFilterChange: (type: string) => void;
  categoryFilter: string;
  onCategoryFilterChange: (category: string) => void;
  accountFilter: string;
  onAccountFilterChange: (account: string) => void;
  customDateRange: DateRange | null;
  onCustomDateRangeChange: (range: DateRange | null) => void;
  // Data
  categories: Category[];
  accounts: Account[];
  // Result count for feedback
  resultCount: number;
  // Clear action
  onClear: () => void;
}

export function TransactionFiltersSheet({
  open,
  onOpenChange,
  periodType,
  onPeriodTypeChange,
  typeFilter,
  onTypeFilterChange,
  categoryFilter,
  onCategoryFilterChange,
  accountFilter,
  onAccountFilterChange,
  customDateRange,
  onCustomDateRangeChange,
  categories,
  accounts,
  resultCount,
  onClear,
}: TransactionFiltersSheetProps) {
  const handleDateRangeSelect = (range: { from?: Date; to?: Date } | undefined) => {
    if (range?.from && range?.to) {
      onCustomDateRangeChange({ from: range.from, to: range.to });
    } else if (range?.from) {
      onCustomDateRangeChange({ from: range.from, to: range.from });
    }
  };

  const handlePeriodChange = (type: PeriodType) => {
    // Clear custom range when selecting a fixed period
    if (customDateRange) {
      onCustomDateRangeChange(null);
    }
    onPeriodTypeChange(type);
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[85vh]">
        <div className="mx-auto w-full max-w-md">
          <DrawerHeader className="border-b">
            <div className="flex items-center justify-between">
              <DrawerTitle>Filtros</DrawerTitle>
              <Button variant="ghost" size="sm" onClick={onClear}>
                Limpar
              </Button>
            </div>
          </DrawerHeader>

          <div className="overflow-y-auto p-4 space-y-6">
            {/* Period Type */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Período</Label>
              <PeriodSelector
                value={customDateRange ? "custom" : periodType}
                onChange={handlePeriodChange}
                hasCustomRange={!!customDateRange}
                className="w-full justify-center"
              />
            </div>

            {/* Custom Date Range */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Ou selecione um intervalo</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {customDateRange ? (
                      <span>
                        {format(customDateRange.from, "dd/MMM", { locale: ptBR })} -{" "}
                        {format(customDateRange.to, "dd/MMM", { locale: ptBR })}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">Selecionar intervalo</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="center">
                  <Calendar
                    mode="range"
                    selected={
                      customDateRange
                        ? { from: customDateRange.from, to: customDateRange.to }
                        : undefined
                    }
                    onSelect={handleDateRangeSelect}
                    numberOfMonths={1}
                    locale={ptBR}
                  />
                </PopoverContent>
              </Popover>
              {customDateRange && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-muted-foreground"
                  onClick={() => onCustomDateRangeChange(null)}
                >
                  Limpar período personalizado
                </Button>
              )}
            </div>

            {/* Type Filter */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Tipo</Label>
              <Select value={typeFilter} onValueChange={onTypeFilterChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="income">Receitas</SelectItem>
                  <SelectItem value="expense">Despesas</SelectItem>
                  <SelectItem value="transfer">Transferências</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Category Filter - only show if not filtering transfers */}
            {typeFilter !== "transfer" && (
              <div className="space-y-3">
                <Label className="text-sm font-medium">Categoria</Label>
                <Select value={categoryFilter} onValueChange={onCategoryFilterChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.icon && <span className="mr-2">{category.icon}</span>}
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Account Filter */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Conta</Label>
              <Select value={accountFilter} onValueChange={onAccountFilterChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Conta" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {accounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.icon && <span className="mr-2">{account.icon}</span>}
                      {account.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Result Counter */}
          <div className="border-t p-4">
            <p className="text-sm text-center text-muted-foreground">
              Mostrando {resultCount} transaç{resultCount === 1 ? "ão" : "ões"}
            </p>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
