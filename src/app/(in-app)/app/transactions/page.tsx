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
import {
  COMPACT_TABLE_STYLES,
  GroupToggleRow,
  HoverActions,
  useExpandedGroups,
} from "@/components/ui/compact-table";
import { Label } from "@/components/ui/label";
import {
  Plus,
  Search,
  Loader2,
  Receipt,
  TrendingUp,
  TrendingDown,
  ArrowLeftRight,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { format, isSameMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

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

function formatCurrency(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatCurrencyCompact(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatCurrencyFromDigits(digits: string): string {
  const onlyDigits = digits.replace(/\D/g, "");
  const cents = parseInt(onlyDigits || "0", 10);
  return formatCurrencyCompact(cents);
}

function parseCurrency(value: string): number {
  const cleaned = value.replace(/[^\d,-]/g, "").replace(",", ".");
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : Math.round(parsed * 100);
}

const GRID_COLS = "24px 1fr 120px 120px 100px";

// Group transactions by date
function groupTransactionsByDate(transactions: Transaction[]): Map<string, Transaction[]> {
  const grouped = new Map<string, Transaction[]>();

  for (const transaction of transactions) {
    const dateKey = format(new Date(transaction.date), "yyyy-MM-dd");
    const existing = grouped.get(dateKey) || [];
    grouped.set(dateKey, [...existing, transaction]);
  }

  return grouped;
}

const monthNames = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

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
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const { isExpanded, toggleGroup, setExpandedGroups } = useExpandedGroups([]);

  const handlePrevMonth = () => {
    if (currentMonth === 1) {
      setCurrentYear((y) => y - 1);
      setCurrentMonth(12);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 12) {
      setCurrentYear((y) => y + 1);
      setCurrentMonth(1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
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
        // Expand current date by default
        const now = new Date();
        const currentDateKey = format(now, "yyyy-MM-dd");
        setExpandedGroups([currentDateKey]);
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
      date: format(new Date(transaction.date), "yyyy-MM-dd"),
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

  const filteredTransactions = transactions.filter((t) => {
    const matchesSearch = !searchTerm ||
      (t.description?.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (t.category?.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (t.account?.name.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesType = typeFilter === "all" || t.type === typeFilter;
    return matchesSearch && matchesType;
  });

  const groupedTransactions = groupTransactionsByDate(filteredTransactions);
  const sortedDates = Array.from(groupedTransactions.keys()).sort((a, b) =>
    new Date(b).getTime() - new Date(a).getTime()
  );

  // Calculate totals for the selected month (transactions are already filtered by month from API)
  const totalIncome = transactions
    .filter((t) => t.type === "income")
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpenses = transactions
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + t.amount, 0);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "income":
        return <TrendingUp className="h-3.5 w-3.5 text-green-500" />;
      case "expense":
        return <TrendingDown className="h-3.5 w-3.5 text-red-500" />;
      case "transfer":
        return <ArrowLeftRight className="h-3.5 w-3.5 text-blue-500" />;
      default:
        return null;
    }
  };

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Transações</h1>
          <p className="text-sm text-muted-foreground">
            Gerencie todas as suas movimentações financeiras
          </p>
        </div>
        <div className="flex items-center gap-4">
          {/* Month Navigation */}
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handlePrevMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-semibold min-w-[120px] text-center">
              {monthNames[currentMonth - 1]} {currentYear}
            </span>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleNextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <Button onClick={openCreateForm} size="sm">
            <Plus className="mr-2 h-4 w-4" />
            Nova Transação
          </Button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-lg border bg-card p-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <TrendingUp className="h-4 w-4 text-green-500" />
            <span>Receitas</span>
          </div>
          <div className="mt-1 text-xl font-bold text-green-600">
            {formatCurrency(totalIncome)}
          </div>
        </div>

        <div className="rounded-lg border bg-card p-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <TrendingDown className="h-4 w-4 text-red-500" />
            <span>Despesas</span>
          </div>
          <div className="mt-1 text-xl font-bold text-red-600">
            {formatCurrency(totalExpenses)}
          </div>
        </div>

        <div className="rounded-lg border bg-card p-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Receipt className="h-4 w-4" />
            <span>Saldo</span>
          </div>
          <div className={cn(
            "mt-1 text-xl font-bold",
            totalIncome - totalExpenses >= 0 ? "text-green-600" : "text-red-600"
          )}>
            {formatCurrency(totalIncome - totalExpenses)}
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

      {/* Compact Transactions Table */}
      {transactions.length > 0 ? (
        <div className="rounded-lg border bg-card">
          {/* Table Header */}
          <div
            className={COMPACT_TABLE_STYLES.header}
            style={{ gridTemplateColumns: GRID_COLS }}
          >
            <div></div>
            <div>Descrição</div>
            <div>Categoria</div>
            <div>Conta</div>
            <div className="text-right">Valor</div>
          </div>

          {/* Grouped by Date */}
          {sortedDates.map((dateKey) => {
            const dayTransactions = groupedTransactions.get(dateKey) || [];
            const expanded = isExpanded(dateKey);
            const dayTotal = dayTransactions.reduce((sum, t) => {
              if (t.type === "income") return sum + t.amount;
              if (t.type === "expense") return sum - t.amount;
              return sum;
            }, 0);

            return (
              <div key={dateKey}>
                <GroupToggleRow
                  isExpanded={expanded}
                  onToggle={() => toggleGroup(dateKey)}
                  icon="📅"
                  label={format(new Date(dateKey), "EEEE, dd 'de' MMMM", { locale: ptBR })}
                  count={dayTransactions.length}
                  gridCols={GRID_COLS}
                  emptyColsCount={2}
                  summary={
                    <>
                      {dayTotal >= 0 ? "+" : ""}
                      {formatCurrencyCompact(dayTotal)}
                    </>
                  }
                  summaryClassName={dayTotal >= 0 ? "text-green-600" : "text-red-600"}
                />

                {/* Transaction Rows */}
                {expanded && dayTransactions.map((transaction) => (
                  <div
                    key={transaction.id}
                    className={COMPACT_TABLE_STYLES.itemRow}
                    style={{ gridTemplateColumns: GRID_COLS }}
                  >
                    <div className="flex items-center justify-center">
                      {getTypeIcon(transaction.type)}
                    </div>
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="truncate font-medium">
                        {transaction.description || "Sem descrição"}
                      </span>
                      {transaction.isInstallment && transaction.installmentNumber && transaction.totalInstallments && (
                        <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                          {transaction.installmentNumber}/{transaction.totalInstallments}
                        </span>
                      )}
                      <HoverActions
                        onEdit={() => openEditForm(transaction)}
                        onDelete={() => setDeletingTransaction(transaction)}
                        editTitle="Editar transação"
                        deleteTitle="Excluir transação"
                      />
                    </div>
                    <div className="flex items-center gap-1.5 text-muted-foreground truncate">
                      {transaction.category ? (
                        <>
                          <span>{transaction.category.icon || "📌"}</span>
                          <span className="truncate">{transaction.category.name}</span>
                        </>
                      ) : (
                        <span className="text-xs">Sem categoria</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 text-muted-foreground truncate">
                      {transaction.account ? (
                        <>
                          <span>{transaction.account.icon || "🏦"}</span>
                          <span className="truncate">{transaction.account.name}</span>
                        </>
                      ) : (
                        <span className="text-xs">-</span>
                      )}
                    </div>
                    <div className={cn(
                      "text-right font-medium tabular-nums",
                      transaction.type === "income" ? "text-green-600" :
                      transaction.type === "expense" ? "text-red-600" : "text-blue-600"
                    )}>
                      {transaction.type === "expense" && "-"}
                      {transaction.type === "income" && "+"}
                      {formatCurrencyCompact(Math.abs(transaction.amount))}
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed bg-card p-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <Receipt className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="font-semibold">Nenhuma transação ainda</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Comece registrando sua primeira transação para acompanhar suas finanças
          </p>
          <Button className="mt-4" onClick={openCreateForm}>
            <Plus className="mr-2 h-4 w-4" />
            Adicionar Transação
          </Button>
        </div>
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
