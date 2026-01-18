"use client";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
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
import type { PeriodType, DateRange } from "@/components/ui/period-navigator";

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
  // Filters
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
  // Actions
  onApply: () => void;
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
  onApply,
  onClear,
}: TransactionFiltersSheetProps) {
  const handleDateRangeSelect = (range: { from?: Date; to?: Date } | undefined) => {
    if (range?.from && range?.to) {
      onCustomDateRangeChange({ from: range.from, to: range.to });
    } else if (range?.from) {
      // Partial selection - waiting for end date
      onCustomDateRangeChange({ from: range.from, to: range.from });
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader className="border-b pb-4">
          <div className="flex items-center justify-between">
            <SheetTitle>Filtros</SheetTitle>
            <Button variant="ghost" size="sm" onClick={onClear}>
              Limpar
            </Button>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto py-4 space-y-6">
          {/* Period Type */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Período</Label>
            <RadioGroup
              value={periodType}
              onValueChange={(value) => onPeriodTypeChange(value as PeriodType)}
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="week" id="period-week" />
                <Label htmlFor="period-week" className="cursor-pointer">
                  Semana
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="month" id="period-month" />
                <Label htmlFor="period-month" className="cursor-pointer">
                  Mês
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="year" id="period-year" />
                <Label htmlFor="period-year" className="cursor-pointer">
                  Ano
                </Label>
              </div>
            </RadioGroup>
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

          {/* Category Filter */}
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

          {/* Custom Date Range */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Data personalizada</Label>
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
              <PopoverContent className="w-auto p-0" align="start">
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
                Limpar data personalizada
              </Button>
            )}
          </div>
        </div>

        <SheetFooter className="border-t pt-4">
          <Button className="w-full" onClick={onApply}>
            Aplicar Filtros
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
