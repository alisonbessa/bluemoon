"use client";

import { Button } from "@/shared/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/shared/ui/drawer";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import { Label } from "@/shared/ui/label";
import type { Category, Account, TypeFilter } from '../types';

interface TransactionFiltersSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // Filters - all apply immediately
  typeFilter: TypeFilter;
  onTypeFilterChange: (type: TypeFilter) => void;
  categoryFilter: string;
  onCategoryFilterChange: (category: string) => void;
  accountFilter: string;
  onAccountFilterChange: (account: string) => void;
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
  typeFilter,
  onTypeFilterChange,
  categoryFilter,
  onCategoryFilterChange,
  accountFilter,
  onAccountFilterChange,
  categories,
  accounts,
  resultCount,
  onClear,
}: TransactionFiltersSheetProps) {
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
            {/* Type Filter */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Tipo</Label>
              <Select value={typeFilter} onValueChange={(v) => onTypeFilterChange(v as TypeFilter)}>
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
