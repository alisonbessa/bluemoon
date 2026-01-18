"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import {
  Plus,
  Search,
  Loader2,
  Receipt,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { MonthSelector } from "@/components/ui/month-selector";
import { format } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  formatCurrencyCompact,
  formatCurrencyFromDigits,
  parseCurrency,
  parseLocalDate,
} from "@/lib/formatters";
import { TransactionWidget } from "@/components/transactions/transaction-widget";

interface Category {
  id: string;
  name: string;
  icon?: string | null;
}

interface Account {
  id: string;
  name: string;
  type: string;
  icon?: string | null;
}

interface IncomeSource {
  id: string;
  name: string;
  type: string;
  amount: number;
  frequency: string;
}

interface Transaction {
  id: string;
  date: string;
  description?: string | null;
  amount: number;
  type: "income" | "expense" | "transfer";
  categoryId?: string | null;
  accountId: string;
  status: string;
  isInstallment?: boolean;
  installmentNumber?: number | null;
  totalInstallments?: number | null;
  account?: Account | null;
  category?: Category | null;
}

interface Budget {
  id: string;
  name: string;
}

export default function TransactionsPage() {
  const today = new Date();
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth() + 1);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [incomeSources, setIncomeSources] = useState<IncomeSource[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [widgetRefreshKey, setWidgetRefreshKey] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  const handleMonthChange = (year: number, month: number) => {
    setCurrentYear(year);
    setCurrentMonth(month);
  };

  // Form states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [deletingTransaction, setDeletingTransaction] = useState<Transaction | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form data
  const [formData, setFormData] = useState({
    type: "expense" as "income" | "expense" | "transfer",
    amount: "",
    description: "",
    accountId: "",
    categoryId: "",
    incomeSourceId: "",
    toAccountId: "",
    date: format(new Date(), "yyyy-MM-dd"),
    isInstallment: false,
    totalInstallments: 2,
  });

  const fetchData = useCallback(async () => {
    // Calculate start and end dates for the current month
    const startDate = new Date(currentYear, currentMonth - 1, 1);
    const endDate = new Date(currentYear, currentMonth, 0);

    try {
      const [transactionsRes, categoriesRes, accountsRes, budgetsRes, incomeSourcesRes] = await Promise.all([
        fetch(`/api/app/transactions?limit=500&startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`),
        fetch("/api/app/categories"),
        fetch("/api/app/accounts"),
        fetch("/api/app/budgets"),
        fetch("/api/app/income-sources"),
      ]);

      if (transactionsRes.ok) {
        const data = await transactionsRes.json();
        setTransactions(data.transactions || []);
      }

      if (categoriesRes.ok) {
        const data = await categoriesRes.json();
        setCategories(data.flatCategories || []);
      }

      if (accountsRes.ok) {
        const data = await accountsRes.json();
        setAccounts(data.accounts || []);
      }

      if (budgetsRes.ok) {
        const data = await budgetsRes.json();
        setBudgets(data.budgets || []);
      }

      if (incomeSourcesRes.ok) {
        const data = await incomeSourcesRes.json();
        setIncomeSources(data.incomeSources || []);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Erro ao carregar dados");
    } finally {
      setIsLoading(false);
    }
  }, [currentYear, currentMonth]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const openCreateForm = () => {
    setFormData({
      type: "expense",
      amount: "",
      description: "",
      accountId: accounts[0]?.id || "",
      categoryId: "",
      incomeSourceId: "",
      toAccountId: "",
      date: format(new Date(), "yyyy-MM-dd"),
      isInstallment: false,
      totalInstallments: 2,
    });
    setEditingTransaction(null);
    setIsFormOpen(true);
  };

  const openEditForm = (transaction: Transaction) => {
    setFormData({
      type: transaction.type,
      amount: formatCurrencyCompact(transaction.amount),
      description: transaction.description || "",
      accountId: transaction.accountId,
      categoryId: transaction.categoryId || "",
      incomeSourceId: (transaction as Transaction & { incomeSourceId?: string }).incomeSourceId || "",
      toAccountId: (transaction as Transaction & { toAccountId?: string }).toAccountId || "",
      date: format(parseLocalDate(transaction.date), "yyyy-MM-dd"),
      isInstallment: false, // Editing doesn't allow changing installment
      totalInstallments: 2,
    });
    setEditingTransaction(transaction);
    setIsFormOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.amount || !formData.accountId) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    if (formData.type === "transfer" && !formData.toAccountId) {
      toast.error("Selecione a conta de destino para transferências");
      return;
    }

    if (budgets.length === 0) {
      toast.error("Nenhum orçamento encontrado");
      return;
    }

    setIsSubmitting(true);
    try {
      // Check if this is an installment purchase
      const selectedAccount = accounts.find(a => a.id === formData.accountId);
      const isCreditCard = selectedAccount?.type === "credit_card";
      const canBeInstallment = formData.type === "expense" && isCreditCard && !editingTransaction;

      const payload = {
        budgetId: budgets[0].id,
        type: formData.type,
        amount: parseCurrency(formData.amount),
        description: formData.description || undefined,
        accountId: formData.accountId,
        categoryId: formData.type === "expense" ? (formData.categoryId || undefined) : undefined,
        incomeSourceId: formData.type === "income" ? (formData.incomeSourceId || undefined) : undefined,
        toAccountId: formData.type === "transfer" ? (formData.toAccountId || undefined) : undefined,
        date: new Date(formData.date).toISOString(),
        // Installment fields (only for new credit card expenses)
        ...(canBeInstallment && formData.isInstallment ? {
          isInstallment: true,
          totalInstallments: formData.totalInstallments,
        } : {}),
      };

      if (editingTransaction) {
        const response = await fetch(`/api/app/transactions/${editingTransaction.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          throw new Error("Erro ao atualizar transação");
        }

        toast.success("Transação atualizada!");
      } else {
        const response = await fetch("/api/app/transactions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          throw new Error("Erro ao criar transação");
        }

        toast.success("Transação criada!");
      }

      setIsFormOpen(false);
      setEditingTransaction(null);
      fetchData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao salvar");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingTransaction) return;

    try {
      const response = await fetch(`/api/app/transactions/${deletingTransaction.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Erro ao excluir transação");
      }

      toast.success("Transação excluída!");
      setDeletingTransaction(null);
      fetchData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao excluir");
    }
  };

  // Filter out pending transactions - they are shown in the scheduled section
  const confirmedTransactions = transactions.filter((t) => t.status !== "pending");

  // Calculate totals for the summary cards
  const confirmedIncome = confirmedTransactions
    .filter((t) => t.type === "income")
    .reduce((sum, t) => sum + t.amount, 0);

  const confirmedExpenses = confirmedTransactions
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + t.amount, 0);

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Transações</h1>
          <p className="text-sm text-muted-foreground">
            Gerencie todas as suas movimentações financeiras
          </p>
        </div>
        <div className="flex items-center gap-2 sm:gap-4">
          {/* Month Navigation */}
          <MonthSelector
            year={currentYear}
            month={currentMonth}
            onChange={handleMonthChange}
          />
          <Button onClick={openCreateForm} size="sm">
            <Plus className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Nova Transação</span>
          </Button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        <div className="rounded-lg border bg-card p-2 sm:p-3">
          <div className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm text-muted-foreground">
            <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 text-green-500" />
            <span>Receitas</span>
          </div>
          <div className="mt-1 text-base sm:text-xl font-bold text-green-600">
            {formatCurrencyCompact(confirmedIncome)}
          </div>
        </div>

        <div className="rounded-lg border bg-card p-2 sm:p-3">
          <div className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm text-muted-foreground">
            <TrendingDown className="h-3 w-3 sm:h-4 sm:w-4 text-red-500" />
            <span>Despesas</span>
          </div>
          <div className="mt-1 text-base sm:text-xl font-bold text-red-600">
            {formatCurrencyCompact(confirmedExpenses)}
          </div>
        </div>

        <div className="rounded-lg border bg-card p-2 sm:p-3">
          <div className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm text-muted-foreground">
            <Receipt className="h-3 w-3 sm:h-4 sm:w-4" />
            <span>Saldo</span>
          </div>
          <div className={cn(
            "mt-1 text-base sm:text-xl font-bold",
            confirmedIncome - confirmedExpenses >= 0 ? "text-green-600" : "text-red-600"
          )}>
            {formatCurrencyCompact(confirmedIncome - confirmedExpenses)}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar transações..."
            className="pl-10 h-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[160px] h-9">
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

      {/* Transaction Widget - Unified view of pending and confirmed transactions */}
      {budgets.length > 0 && (
        <TransactionWidget
          budgetId={budgets[0].id}
          year={currentYear}
          month={currentMonth}
          refreshKey={widgetRefreshKey}
          confirmedTransactions={confirmedTransactions}
          searchTerm={searchTerm}
          typeFilter={typeFilter}
          onEdit={(scheduled) => {
            // Pre-fill the form with scheduled transaction data for editing before confirming
            setFormData({
              type: scheduled.type,
              amount: (scheduled.amount / 100).toFixed(2).replace(".", ","),
              description: scheduled.name,
              accountId: accounts[0]?.id || "",
              categoryId: scheduled.categoryId || "",
              incomeSourceId: scheduled.incomeSourceId || "",
              toAccountId: "",
              date: format(parseLocalDate(scheduled.dueDate), "yyyy-MM-dd"),
              isInstallment: false,
              totalInstallments: 2,
            });
            setEditingTransaction(null);
            setIsFormOpen(true);
          }}
          onConfirm={async (scheduled) => {
            // Directly create the transaction as cleared (confirmed)
            if (accounts.length === 0) {
              toast.error("Nenhuma conta encontrada");
              return;
            }

            try {
              const payload = {
                budgetId: budgets[0].id,
                type: scheduled.type,
                amount: scheduled.amount,
                description: scheduled.name,
                accountId: accounts[0].id,
                categoryId: scheduled.categoryId || undefined,
                incomeSourceId: scheduled.incomeSourceId || undefined,
                recurringBillId: scheduled.recurringBillId || undefined,
                date: new Date(scheduled.dueDate).toISOString(),
                status: "cleared", // Confirmed = cleared status
              };

              const response = await fetch("/api/app/transactions", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
              });

              if (!response.ok) {
                throw new Error("Erro ao criar transação");
              }

              toast.success("Transação confirmada!");
              setWidgetRefreshKey((k) => k + 1);
              fetchData();
            } catch (error) {
              toast.error(error instanceof Error ? error.message : "Erro ao confirmar");
            }
          }}
        />
      )}

      {/* Create/Edit Transaction Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingTransaction ? "Editar Transação" : "Nova Transação"}
            </DialogTitle>
            <DialogDescription>
              {editingTransaction
                ? "Atualize os dados da transação"
                : "Registre uma nova movimentação financeira"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Tipo</Label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: "expense", label: "Despesa", color: "text-red-500" },
                  { value: "income", label: "Receita", color: "text-green-500" },
                  { value: "transfer", label: "Transferência", color: "text-blue-500" },
                ].map((type) => (
                  <Button
                    key={type.value}
                    type="button"
                    variant={formData.type === type.value ? "default" : "outline"}
                    size="sm"
                    className="w-full"
                    onClick={() => setFormData({ ...formData, type: type.value as "income" | "expense" | "transfer" })}
                  >
                    {type.label}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">Valor</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  R$
                </span>
                <Input
                  id="amount"
                  className="pl-10"
                  placeholder="0,00"
                  value={formData.amount}
                  onChange={(e) => {
                    const formatted = formatCurrencyFromDigits(e.target.value);
                    setFormData({ ...formData, amount: formatted });
                  }}
                  onFocus={(e) => {
                    if (parseCurrency(formData.amount) === 0) {
                      setFormData({ ...formData, amount: "" });
                    }
                    e.target.select();
                  }}
                  onBlur={() => {
                    if (!formData.amount.trim()) {
                      setFormData({ ...formData, amount: "0,00" });
                    }
                  }}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Input
                id="description"
                placeholder="Ex: Supermercado"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            <div className={formData.type === "transfer" ? "grid grid-cols-2 gap-4" : ""}>
              <div className="space-y-2 w-full">
                <Label htmlFor="account">{formData.type === "transfer" ? "Origem" : "Conta"}</Label>
                <Select
                  value={formData.accountId}
                  onValueChange={(value) => setFormData({ ...formData, accountId: value })}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecione uma conta" />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.map((account) => (
                      <SelectItem key={account.id} value={account.id}>
                        {account.icon || "🏦"} {account.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {formData.type === "transfer" && (
                <div className="space-y-2 w-full">
                  <Label htmlFor="toAccount">Destino</Label>
                  <Select
                    value={formData.toAccountId}
                    onValueChange={(value) => setFormData({ ...formData, toAccountId: value })}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Selecione a conta" />
                    </SelectTrigger>
                    <SelectContent>
                      {accounts
                        .filter((account) => account.id !== formData.accountId)
                        .map((account) => (
                          <SelectItem key={account.id} value={account.id}>
                            {account.icon || "🏦"} {account.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {formData.type === "expense" && (
              <div className="space-y-2">
                <Label htmlFor="category">Categoria</Label>
                <Select
                  value={formData.categoryId}
                  onValueChange={(value) => setFormData({ ...formData, categoryId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.icon || "📌"} {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Installment option (only for credit card expenses when creating) */}
            {(() => {
              const selectedAccount = accounts.find(a => a.id === formData.accountId);
              const isCreditCard = selectedAccount?.type === "credit_card";
              const showInstallmentOption = formData.type === "expense" && isCreditCard && !editingTransaction;

              if (!showInstallmentOption) return null;

              return (
                <div className="space-y-3 rounded-lg border p-3 bg-muted/30">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="installment" className="cursor-pointer">
                      Parcelar compra
                    </Label>
                    <Switch
                      id="installment"
                      checked={formData.isInstallment}
                      onCheckedChange={(checked) =>
                        setFormData({
                          ...formData,
                          isInstallment: checked,
                          totalInstallments: checked ? 2 : 2,
                        })
                      }
                    />
                  </div>
                  {formData.isInstallment && (
                    <div className="space-y-2">
                      <Label htmlFor="totalInstallments">Número de parcelas</Label>
                      <Select
                        value={String(formData.totalInstallments)}
                        onValueChange={(value) =>
                          setFormData({
                            ...formData,
                            totalInstallments: parseInt(value),
                          })
                        }
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 23 }, (_, i) => i + 2).map((num) => (
                            <SelectItem key={num} value={String(num)}>
                              {num}x {parseCurrency(formData.amount) > 0 && (
                                <span className="text-muted-foreground ml-1">
                                  (R$ {(parseCurrency(formData.amount) / num / 100).toFixed(2).replace(".", ",")}/mês)
                                </span>
                              )}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              );
            })()}

            {formData.type === "income" && (
              <div className="space-y-2">
                <Label htmlFor="incomeSource">Fonte de Renda</Label>
                <Select
                  value={formData.incomeSourceId}
                  onValueChange={(value) => setFormData({ ...formData, incomeSourceId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma fonte de renda" />
                  </SelectTrigger>
                  <SelectContent>
                    {incomeSources.map((source) => (
                      <SelectItem key={source.id} value={source.id}>
                        {source.type === "salary" ? "💼" : source.type === "benefit" ? "🎁" : source.type === "freelance" ? "💻" : source.type === "rental" ? "🏠" : source.type === "investment" ? "📈" : "📦"} {source.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="date">Data</Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              />
            </div>
          </div>

          <DialogFooter className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setIsFormOpen(false)}
              disabled={isSubmitting}
              className="w-1/4"
            >
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting} className="w-1/4">
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingTransaction ? "Salvar" : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog
        open={!!deletingTransaction}
        onOpenChange={(open) => !open && setDeletingTransaction(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir transação?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta transação? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
