"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Loader2,
  Plus,
  Undo2,
  Redo2,
  PiggyBank,
  Pencil,
  Trash2,
  Copy,
} from "lucide-react";
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
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Category {
  id: string;
  name: string;
  icon?: string | null;
  behavior: "set_aside" | "refill_up";
  plannedAmount: number;
}

interface Group {
  id: string;
  code: string;
  name: string;
  icon?: string | null;
  displayOrder: number;
}

interface CategoryAllocation {
  category: Category;
  allocated: number;
  carriedOver: number;
  spent: number;
  available: number;
}

interface GroupData {
  group: Group;
  categories: CategoryAllocation[];
  totals: {
    allocated: number;
    spent: number;
    available: number;
  };
}

interface Budget {
  id: string;
  name: string;
}

interface IncomeSource {
  id: string;
  name: string;
  type: string;
  amount: number;
  memberId: string | null;
}

interface Member {
  id: string;
  name: string;
  color: string | null;
}

interface IncomeSourceData {
  incomeSource: IncomeSource;
  planned: number;
  defaultAmount: number;
  received: number;
}

interface IncomeMemberGroup {
  member: Member | null;
  sources: IncomeSourceData[];
  totals: { planned: number; received: number };
}

interface IncomeData {
  byMember: IncomeMemberGroup[];
  totals: { planned: number; received: number };
}

type FilterType = "all" | "underfunded" | "overfunded" | "money_available";

function formatCurrency(cents: number): string {
  const value = cents / 100;
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  });
}

const monthNamesFull = [
  "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
  "Jul", "Ago", "Set", "Out", "Nov", "Dez",
];

export default function BudgetPage() {
  const router = useRouter();
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [groupsData, setGroupsData] = useState<GroupData[]>([]);
  const [totals, setTotals] = useState({ allocated: 0, spent: 0, available: 0 });
  const [incomeData, setIncomeData] = useState<IncomeData | null>(null);
  const [totalIncome, setTotalIncome] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedGroups, setExpandedGroups] = useState<string[]>([]);
  const [expandedIncomeMembers, setExpandedIncomeMembers] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");
  const [editingCategory, setEditingCategory] = useState<{
    category: Category;
    allocated: number;
  } | null>(null);
  const [editValue, setEditValue] = useState("");
  const [editBehavior, setEditBehavior] = useState<"set_aside" | "refill_up">("refill_up");
  const [editFrequency, setEditFrequency] = useState<"weekly" | "monthly" | "yearly" | "once">("monthly");
  const [editDueDay, setEditDueDay] = useState<number | null>(null);
  const [editWeekday, setEditWeekday] = useState<number | null>(null); // 0=Dom, 1=Seg, etc
  const [editYearMonth, setEditYearMonth] = useState<number | null>(null); // 1-12

  // New category modal
  const [newCategoryGroupId, setNewCategoryGroupId] = useState<string | null>(null);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryIcon, setNewCategoryIcon] = useState("");
  const [newCategoryIconMode, setNewCategoryIconMode] = useState<"recent" | "food" | "transport" | "home" | "health" | "entertainment" | "money" | "other">("recent");
  const [newCategoryBehavior, setNewCategoryBehavior] = useState<"set_aside" | "refill_up">("refill_up");
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);

  // Mapping of group codes to default behaviors
  const GROUP_DEFAULT_BEHAVIORS: Record<string, "set_aside" | "refill_up"> = {
    essential: "refill_up",
    lifestyle: "set_aside",
    pleasures: "set_aside",
    goals: "set_aside",
    investments: "set_aside",
  };

  // Edit/Delete category
  const [editCategoryData, setEditCategoryData] = useState<Category | null>(null);
  const [editCategoryName, setEditCategoryName] = useState("");
  const [editCategoryIcon, setEditCategoryIcon] = useState("");
  const [editCategoryIconMode, setEditCategoryIconMode] = useState<"recent" | "food" | "transport" | "home" | "health" | "entertainment" | "money" | "other">("recent");
  const [isUpdatingCategory, setIsUpdatingCategory] = useState(false);
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(null);
  const [isDeletingCategory, setIsDeletingCategory] = useState(false);

  // Copy budget state
  const [isCopyingBudget, setIsCopyingBudget] = useState(false);
  const [showCopyConfirm, setShowCopyConfirm] = useState(false);

  // Edit income source state
  const [editingIncome, setEditingIncome] = useState<{
    incomeSource: IncomeSource;
    planned: number;
    defaultAmount: number;
  } | null>(null);
  const [editIncomeValue, setEditIncomeValue] = useState("");

  const today = new Date();
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth() + 1);

  const fetchData = useCallback(async () => {
    try {
      const budgetsRes = await fetch("/api/app/budgets");

      if (budgetsRes.ok) {
        const data = await budgetsRes.json();
        setBudgets(data.budgets || []);

        if (data.budgets?.length > 0) {
          const allocationsRes = await fetch(
            `/api/app/allocations?budgetId=${data.budgets[0].id}&year=${currentYear}&month=${currentMonth}`
          );

          if (allocationsRes.ok) {
            const allocData = await allocationsRes.json();
            setGroupsData(allocData.groups || []);
            setTotals(allocData.totals || { allocated: 0, spent: 0, available: 0 });
            setExpandedGroups(allocData.groups?.map((g: GroupData) => g.group.id) || []);

            // Set income data from allocations API
            if (allocData.income) {
              setIncomeData(allocData.income);
              setTotalIncome(allocData.income.totals.planned || 0);
              // Expand all members by default
              const memberIds = allocData.income.byMember
                .map((m: IncomeMemberGroup) => m.member?.id || "no-member")
                .filter(Boolean);
              setExpandedIncomeMembers(memberIds);
            }
          }
        }
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

  const toggleGroup = (groupId: string) => {
    setExpandedGroups((prev) =>
      prev.includes(groupId)
        ? prev.filter((id) => id !== groupId)
        : [...prev, groupId]
    );
  };

  const toggleIncomeMember = (memberId: string) => {
    setExpandedIncomeMembers((prev) =>
      prev.includes(memberId)
        ? prev.filter((id) => id !== memberId)
        : [...prev, memberId]
    );
  };

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

  const openEditModal = (category: Category, allocated: number) => {
    setEditingCategory({ category, allocated });
    setEditValue((allocated / 100).toFixed(2).replace(".", ","));
    setEditBehavior(category.behavior);
    setEditFrequency("monthly"); // TODO: load from category when available
    setEditDueDay(null); // TODO: load from category when available
    setEditWeekday(null);
    setEditYearMonth(null);
  };

  // Calcula quantas vezes um dia da semana aparece no mês
  const countWeekdayInMonth = (year: number, month: number, weekday: number): number => {
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);
    const daysInMonth = lastDay.getDate();

    let count = 0;
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month - 1, day);
      if (date.getDay() === weekday) count++;
    }
    return count;
  };

  // Calcula o valor mensal baseado na frequência
  const getMonthlyValue = (): { value: number; description: string } => {
    const cleanValue = editValue.replace(/[^\d,-]/g, "").replace(",", ".");
    const baseValue = Math.round(parseFloat(cleanValue || "0") * 100);

    if (editFrequency === "weekly" && editWeekday !== null) {
      const count = countWeekdayInMonth(currentYear, currentMonth, editWeekday);
      return {
        value: baseValue * count,
        description: `${count}x no mês = R$ ${((baseValue * count) / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
      };
    }

    if (editFrequency === "yearly") {
      if (editYearMonth === currentMonth) {
        return { value: baseValue, description: "Vence este mês" };
      }
      return { value: 0, description: "Não vence este mês" };
    }

    return { value: baseValue, description: "" };
  };

  const weekdays = [
    { value: 0, label: "Domingo", short: "Dom" },
    { value: 1, label: "Segunda", short: "Seg" },
    { value: 2, label: "Terça", short: "Ter" },
    { value: 3, label: "Quarta", short: "Qua" },
    { value: 4, label: "Quinta", short: "Qui" },
    { value: 5, label: "Sexta", short: "Sex" },
    { value: 6, label: "Sábado", short: "Sáb" },
  ];

  const handleSaveAllocation = async () => {
    if (!editingCategory || budgets.length === 0) return;

    const cleanValue = editValue.replace(/[^\d,-]/g, "").replace(",", ".");
    const newValue = Math.round(parseFloat(cleanValue || "0") * 100);

    try {
      const response = await fetch("/api/app/allocations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          budgetId: budgets[0].id,
          categoryId: editingCategory.category.id,
          year: currentYear,
          month: currentMonth,
          allocated: newValue,
          behavior: editBehavior,
        }),
      });

      if (!response.ok) {
        throw new Error("Erro ao atualizar alocação");
      }

      toast.success("Alocação atualizada!");
      setEditingCategory(null);
      fetchData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao salvar");
    }
  };

  const handleCreateCategory = async () => {
    if (!newCategoryGroupId || !newCategoryName.trim() || budgets.length === 0) return;

    setIsCreatingCategory(true);
    try {
      const response = await fetch("/api/app/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          budgetId: budgets[0].id,
          groupId: newCategoryGroupId,
          name: newCategoryName.trim(),
          icon: newCategoryIcon || null,
          behavior: newCategoryBehavior,
          suggestIcon: !newCategoryIcon, // Auto-suggest if no icon selected
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Erro ao criar categoria");
      }

      toast.success("Categoria criada!");
      setNewCategoryGroupId(null);
      setNewCategoryName("");
      setNewCategoryIcon("");
      setNewCategoryIconMode("recent");
      setNewCategoryBehavior("refill_up");
      fetchData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao criar categoria");
    } finally {
      setIsCreatingCategory(false);
    }
  };

  const selectedGroupForNewCategory = groupsData.find(g => g.group.id === newCategoryGroupId)?.group;

  const openEditCategoryModal = (category: Category) => {
    setEditCategoryData(category);
    setEditCategoryName(category.name);
    setEditCategoryIcon(category.icon || "");
    setEditCategoryIconMode("recent");
  };

  const handleUpdateCategory = async () => {
    if (!editCategoryData || !editCategoryName.trim()) return;

    setIsUpdatingCategory(true);
    try {
      const response = await fetch(`/api/app/categories/${editCategoryData.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editCategoryName.trim(),
          icon: editCategoryIcon || null,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Erro ao atualizar categoria");
      }

      toast.success("Categoria atualizada!");
      setEditCategoryData(null);
      fetchData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao atualizar categoria");
    } finally {
      setIsUpdatingCategory(false);
    }
  };

  const handleDeleteCategory = async () => {
    if (!deletingCategory) return;

    setIsDeletingCategory(true);
    try {
      const response = await fetch(`/api/app/categories/${deletingCategory.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Erro ao excluir categoria");
      }

      toast.success("Categoria excluída!");
      setDeletingCategory(null);
      fetchData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao excluir categoria");
    } finally {
      setIsDeletingCategory(false);
    }
  };

  // Get previous month
  const getPreviousMonth = () => {
    if (currentMonth === 1) {
      return { year: currentYear - 1, month: 12 };
    }
    return { year: currentYear, month: currentMonth - 1 };
  };

  const handleCopyFromPreviousMonth = async (overwrite: boolean = false) => {
    if (budgets.length === 0) return;

    setIsCopyingBudget(true);
    const prev = getPreviousMonth();

    try {
      const response = await fetch("/api/app/allocations/copy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          budgetId: budgets[0].id,
          fromYear: prev.year,
          fromMonth: prev.month,
          toYear: currentYear,
          toMonth: currentMonth,
          overwrite,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.requiresOverwrite) {
          setShowCopyConfirm(true);
          return;
        }
        throw new Error(data.error || "Erro ao copiar orçamento");
      }

      toast.success(`${data.copiedCount} alocações copiadas de ${monthNamesFull[prev.month - 1]}!`);
      setShowCopyConfirm(false);
      fetchData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao copiar orçamento");
    } finally {
      setIsCopyingBudget(false);
    }
  };

  const formatInputValue = (value: string): string => {
    const onlyDigits = value.replace(/\D/g, "");
    const cents = parseInt(onlyDigits || "0", 10);
    return (cents / 100).toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const openEditIncomeModal = (item: IncomeSourceData) => {
    setEditingIncome({
      incomeSource: item.incomeSource,
      planned: item.planned,
      defaultAmount: item.defaultAmount,
    });
    setEditIncomeValue((item.planned / 100).toFixed(2).replace(".", ","));
  };

  const handleSaveIncomeAllocation = async () => {
    if (!editingIncome || budgets.length === 0) return;

    const cleanValue = editIncomeValue.replace(/[^\d,-]/g, "").replace(",", ".");
    const newValue = Math.round(parseFloat(cleanValue || "0") * 100);

    try {
      const response = await fetch("/api/app/income-allocations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          budgetId: budgets[0].id,
          incomeSourceId: editingIncome.incomeSource.id,
          year: currentYear,
          month: currentMonth,
          planned: newValue,
        }),
      });

      if (!response.ok) {
        throw new Error("Erro ao atualizar receita");
      }

      toast.success("Receita atualizada!");
      setEditingIncome(null);
      fetchData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao salvar");
    }
  };

  const toggleCategorySelection = (categoryId: string) => {
    setSelectedCategories((prev) =>
      prev.includes(categoryId)
        ? prev.filter((id) => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const toggleGroupSelection = (groupId: string) => {
    const group = groupsData.find((g) => g.group.id === groupId);
    if (!group) return;

    const categoryIds = group.categories.map((c) => c.category.id);
    const allSelected = categoryIds.every((id) => selectedCategories.includes(id));

    if (allSelected) {
      setSelectedCategories((prev) => prev.filter((id) => !categoryIds.includes(id)));
    } else {
      setSelectedCategories((prev) => [...new Set([...prev, ...categoryIds])]);
    }
  };

  const filterCategories = (categories: CategoryAllocation[]): CategoryAllocation[] => {
    switch (activeFilter) {
      case "underfunded":
        return categories.filter((c) => c.available < 0);
      case "overfunded":
        return categories.filter((c) => c.available > c.allocated && c.allocated > 0);
      case "money_available":
        return categories.filter((c) => c.available > 0);
      default:
        return categories;
    }
  };

  const unallocated = totalIncome - totals.allocated;

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (budgets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <PiggyBank className="h-16 w-16 text-muted-foreground" />
        <h2 className="text-xl font-semibold">Nenhum orçamento encontrado</h2>
        <p className="text-muted-foreground">Complete o onboarding para começar</p>
        <Button onClick={() => router.push("/app")}>
          Ir para o Dashboard
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Sticky Header */}
      <div className="sticky top-0 z-20 bg-background">
        {/* Top Bar */}
        <div className="flex items-center justify-between px-4 py-2 border-b">
          {/* Month Navigation */}
          <div className="flex items-center">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handlePrevMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-semibold min-w-[80px] text-center">
              {monthNamesFull[currentMonth - 1]} {currentYear}
            </span>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleNextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Summary */}
          <div
            data-tutorial="budget-available"
            className={cn(
              "flex items-center gap-2 px-3 py-1 rounded text-sm",
              unallocated === 0 && totalIncome > 0 ? "bg-green-100 dark:bg-green-900/30 text-green-700" :
              unallocated < 0 ? "bg-red-100 dark:bg-red-900/30 text-red-700" : "bg-muted"
            )}
          >
            <span className="font-bold">{formatCurrency(Math.abs(unallocated))}</span>
            <span className="text-xs">
              {unallocated === 0 && totalIncome > 0 ? "Alocado" : unallocated < 0 ? "Excedido" : "Para Alocar"}
            </span>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center justify-between px-4 py-1 border-b bg-muted/30 text-xs">
          <div className="flex items-center gap-1">
            {[
              { key: "all" as FilterType, label: "Todos" },
              { key: "underfunded" as FilterType, label: "Faltando" },
              { key: "overfunded" as FilterType, label: "Excedido" },
              { key: "money_available" as FilterType, label: "Disponível" },
            ].map((filter) => (
              <button
                key={filter.key}
                className={cn(
                  "px-2 py-1 rounded",
                  activeFilter === filter.key ? "bg-background shadow-sm" : "hover:bg-muted"
                )}
                onClick={() => setActiveFilter(filter.key)}
              >
                {filter.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1">
            <button
              className="px-2 py-1 rounded hover:bg-muted flex items-center gap-1 disabled:opacity-50"
              onClick={() => handleCopyFromPreviousMonth()}
              disabled={isCopyingBudget}
              title={`Copiar orçamento de ${monthNamesFull[getPreviousMonth().month - 1]}`}
            >
              {isCopyingBudget ? <Loader2 className="h-3 w-3 animate-spin" /> : <Copy className="h-3 w-3" />}
              <span className="hidden sm:inline">Copiar de {monthNamesFull[getPreviousMonth().month - 1]}</span>
            </button>
            <button className="px-2 py-1 rounded hover:bg-muted flex items-center gap-1">
              <Plus className="h-3 w-3" /> Grupo
            </button>
            <button className="p-1 rounded hover:bg-muted" disabled><Undo2 className="h-3 w-3 opacity-30" /></button>
            <button className="p-1 rounded hover:bg-muted" disabled><Redo2 className="h-3 w-3 opacity-30" /></button>
          </div>
        </div>

      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {/* Explanatory Banner */}
        <div className="mx-4 mt-3 mb-2 p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-lg">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            <strong>Planejamento:</strong> Aqui você define quanto pretende gastar em cada categoria.
            É como criar um orçamento doméstico! Para registrar gastos reais, vá em{" "}
            <span className="font-medium">Transações</span>.
          </p>
        </div>

        {/* Income Section */}
        {incomeData && incomeData.byMember.length > 0 && (
          <div className="border-b-4 border-green-200 dark:border-green-900">
            {/* Income Section Header */}
            <div className="px-4 py-2 bg-green-100 dark:bg-green-950/50 border-b flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-lg">💰</span>
                <span className="font-bold text-sm text-green-800 dark:text-green-200">RECEITAS</span>
              </div>
              <div className="text-xs text-green-700 dark:text-green-300">
                Fontes de renda do mês
              </div>
            </div>

            {/* Income Table Header */}
            <div className="grid grid-cols-[24px_1fr_110px] px-4 py-1.5 text-[11px] font-medium text-muted-foreground uppercase border-b bg-green-50/50 dark:bg-green-950/20">
              <div />
              <div>Fonte</div>
              <div className="text-right">Planejado</div>
            </div>

            {/* Income Totals Row */}
            <div className="grid grid-cols-[24px_1fr_110px] px-4 py-2 items-center bg-green-50 dark:bg-green-950/30 border-b">
              <div />
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm">Total de Receitas</span>
              </div>
              <div className="text-right text-xs tabular-nums font-bold">{formatCurrency(incomeData.totals.planned)}</div>
            </div>

            {/* If only one member (or no member), show sources directly */}
            {incomeData.byMember.length === 1 ? (
              incomeData.byMember[0].sources.map((item) => {
                const isEdited = item.planned !== item.defaultAmount;
                return (
                  <div
                    key={item.incomeSource.id}
                    className="grid grid-cols-[24px_1fr_110px] px-4 py-1.5 items-center border-b hover:bg-green-50/50 dark:hover:bg-green-950/20 text-sm cursor-pointer"
                    onClick={() => openEditIncomeModal(item)}
                  >
                    <div />
                    <div className="flex items-center gap-1.5 pl-5">
                      <span>{item.incomeSource.type === "salary" ? "💼" : item.incomeSource.type === "benefit" ? "🎁" : item.incomeSource.type === "freelance" ? "💻" : "💵"}</span>
                      <span>{item.incomeSource.name}</span>
                      {isEdited && (
                        <span className="text-[10px] text-amber-600 bg-amber-100 dark:bg-amber-900/30 px-1 rounded">
                          editado
                        </span>
                      )}
                    </div>
                    <div className="text-right text-xs tabular-nums">{formatCurrency(item.planned)}</div>
                  </div>
                );
              })
            ) : (
              /* Multiple members - show with collapsible sections */
              incomeData.byMember.map((memberGroup) => {
                const memberId = memberGroup.member?.id || "no-member";
                const isExpanded = expandedIncomeMembers.includes(memberId);

                return (
                  <div key={memberId}>
                    {/* Member Row */}
                    <div
                      className="group grid grid-cols-[24px_1fr_110px] px-4 py-1.5 items-center bg-green-50/50 dark:bg-green-950/20 border-b cursor-pointer hover:bg-green-100/50 dark:hover:bg-green-950/40 text-sm"
                      onClick={() => toggleIncomeMember(memberId)}
                    >
                      <div />
                      <div className="flex items-center gap-1.5">
                        <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", !isExpanded && "-rotate-90")} />
                        {memberGroup.member && (
                          <span
                            className="h-3 w-3 rounded-full"
                            style={{ backgroundColor: memberGroup.member.color || "#6366f1" }}
                          />
                        )}
                        <span className="font-semibold">{memberGroup.member?.name || "Sem responsável"}</span>
                        <span className="text-xs text-muted-foreground">({memberGroup.sources.length})</span>
                      </div>
                      <div className="text-right text-xs tabular-nums font-bold">{formatCurrency(memberGroup.totals.planned)}</div>
                    </div>

                    {/* Income Sources for this member */}
                    {isExpanded && memberGroup.sources.map((item) => {
                      const isEdited = item.planned !== item.defaultAmount;
                      return (
                        <div
                          key={item.incomeSource.id}
                          className="grid grid-cols-[24px_1fr_110px] px-4 py-1.5 items-center border-b hover:bg-green-50/50 dark:hover:bg-green-950/20 text-sm cursor-pointer"
                          onClick={() => openEditIncomeModal(item)}
                        >
                          <div />
                          <div className="flex items-center gap-1.5 pl-10">
                            <span>{item.incomeSource.type === "salary" ? "💼" : item.incomeSource.type === "benefit" ? "🎁" : item.incomeSource.type === "freelance" ? "💻" : "💵"}</span>
                            <span>{item.incomeSource.name}</span>
                            {isEdited && (
                              <span className="text-[10px] text-amber-600 bg-amber-100 dark:bg-amber-900/30 px-1 rounded">
                                editado
                              </span>
                            )}
                          </div>
                          <div className="text-right text-xs tabular-nums">{formatCurrency(item.planned)}</div>
                        </div>
                      );
                    })}
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Expenses Section */}
        {groupsData.length > 0 && (
          <>
            {/* Expenses Section Header */}
            <div className="px-4 py-2 bg-red-100 dark:bg-red-950/50 border-b flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-lg">💸</span>
                <span className="font-bold text-sm text-red-800 dark:text-red-200">DESPESAS</span>
              </div>
              <div className="text-xs text-red-700 dark:text-red-300">
                Alocação por categoria
              </div>
            </div>

            {/* Expenses Table Header */}
            <div className="grid grid-cols-[24px_1fr_100px_100px_110px] px-4 py-1.5 text-[11px] font-medium text-muted-foreground uppercase border-b bg-muted/50">
              <div />
              <div>Categoria</div>
              <div className="text-right">Alocado</div>
              <div className="text-right">Gasto</div>
              <div className="text-right">Disponível</div>
            </div>
          </>
        )}

        {groupsData.length > 0 ? (
          groupsData.map(({ group, categories, totals: groupTotals }) => {
            const isExpanded = expandedGroups.includes(group.id);
            const filteredCategories = filterCategories(categories);
            const categoryIds = categories.map((c) => c.category.id);
            const allSelected = categoryIds.length > 0 && categoryIds.every((id) => selectedCategories.includes(id));
            const someSelected = categoryIds.some((id) => selectedCategories.includes(id));

            if (activeFilter !== "all" && filteredCategories.length === 0) return null;

            return (
              <div key={group.id}>
                {/* Group Row */}
                <div
                  className="group grid grid-cols-[24px_1fr_100px_100px_110px] px-4 py-1.5 items-center bg-muted/40 border-b cursor-pointer hover:bg-muted/60 text-sm"
                  onClick={() => toggleGroup(group.id)}
                >
                  <Checkbox
                    checked={allSelected}
                    className={cn("h-3.5 w-3.5", someSelected && !allSelected && "opacity-50")}
                    onCheckedChange={() => toggleGroupSelection(group.id)}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <div className="flex items-center gap-1.5">
                    <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", !isExpanded && "-rotate-90")} />
                    <span>{group.icon}</span>
                    <span className="font-bold">{group.name}</span>
                    <button
                      className="ml-1 p-0.5 rounded hover:bg-muted/80 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => {
                        e.stopPropagation();
                        setNewCategoryGroupId(group.id);
                        setNewCategoryName("");
                        setNewCategoryIcon("");
                        setNewCategoryIconMode("recent");
                        // Pre-select behavior based on group
                        const defaultBehavior = GROUP_DEFAULT_BEHAVIORS[group.code] || "refill_up";
                        setNewCategoryBehavior(defaultBehavior);
                      }}
                      title="Adicionar categoria"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="text-right text-xs tabular-nums font-bold">{formatCurrency(groupTotals.allocated)}</div>
                  <div className="text-right text-xs tabular-nums font-bold">{formatCurrency(groupTotals.spent)}</div>
                  <div className={cn(
                    "text-right text-xs tabular-nums font-bold",
                    groupTotals.available >= 0 ? "text-green-600" : "text-red-600"
                  )}>
                    {formatCurrency(groupTotals.available)}
                  </div>
                </div>

                {/* Categories */}
                {isExpanded && filteredCategories.map((item) => {
                  const isSelected = selectedCategories.includes(item.category.id);

                  return (
                    <div
                      key={item.category.id}
                      className={cn(
                        "group/row grid grid-cols-[24px_1fr_100px_100px_110px] px-4 py-1.5 items-center border-b hover:bg-muted/20 text-sm cursor-pointer",
                        isSelected && "bg-primary/5"
                      )}
                      onClick={() => openEditModal(item.category, item.allocated)}
                      data-tutorial="category-row"
                    >
                      <Checkbox
                        checked={isSelected}
                        className="h-3.5 w-3.5"
                        onCheckedChange={() => toggleCategorySelection(item.category.id)}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <div className="flex items-center gap-1.5 pl-5">
                        <span>{item.category.icon || "📌"}</span>
                        <span>{item.category.name}</span>
                        <div className="flex items-center gap-0.5 ml-1 opacity-0 group-hover/row:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              openEditCategoryModal(item.category);
                            }}
                            className="p-1 rounded hover:bg-muted"
                            title="Editar categoria"
                          >
                            <Pencil className="h-3 w-3 text-muted-foreground" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeletingCategory(item.category);
                            }}
                            className="p-1 rounded hover:bg-destructive/10"
                            title="Excluir categoria"
                          >
                            <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                          </button>
                        </div>
                      </div>
                      <div className="text-right text-xs tabular-nums">{formatCurrency(item.allocated)}</div>
                      <div className="text-right text-xs tabular-nums">{formatCurrency(item.spent)}</div>
                      <div className={cn(
                        "text-right text-xs tabular-nums font-medium px-1",
                        item.available > 0 ? "text-green-600" :
                        item.available < 0 ? "text-red-600 bg-red-100 dark:bg-red-900/30 rounded" : ""
                      )}>
                        {formatCurrency(item.available)}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })
        ) : (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <PiggyBank className="h-12 w-12 text-muted-foreground" />
            <h3 className="font-semibold">Nenhuma categoria configurada</h3>
            <Button onClick={() => router.push("/app/categories/setup")}>Configurar Categorias</Button>
          </div>
        )}
      </div>

      {/* Edit Allocation Modal */}
      <Dialog open={!!editingCategory} onOpenChange={(open) => !open && setEditingCategory(null)}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span>{editingCategory?.category.icon || "📌"}</span>
              <span>{editingCategory?.category.name}</span>
            </DialogTitle>
            <DialogDescription>
              Configure a alocação para {monthNamesFull[currentMonth - 1]} {currentYear}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Valor */}
            <div className="grid gap-2">
              <Label htmlFor="allocated">
                {editFrequency === "weekly" ? "Valor por Semana" : "Valor"}
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                  R$
                </span>
                <Input
                  id="allocated"
                  className="pl-9"
                  placeholder="0,00"
                  value={editValue}
                  onChange={(e) => setEditValue(formatInputValue(e.target.value))}
                  onFocus={(e) => e.target.select()}
                />
              </div>
            </div>

            {/* Frequência */}
            <div className="grid gap-2">
              <Label>Frequência</Label>
              <div className="grid grid-cols-4 gap-1.5">
                {[
                  { value: "weekly" as const, label: "Semanal" },
                  { value: "monthly" as const, label: "Mensal" },
                  { value: "yearly" as const, label: "Anual" },
                  { value: "once" as const, label: "Único" },
                ].map((freq) => (
                  <button
                    key={freq.value}
                    type="button"
                    onClick={() => setEditFrequency(freq.value)}
                    className={cn(
                      "rounded-lg border py-2 px-2 text-xs font-medium transition-colors",
                      editFrequency === freq.value
                        ? "border-primary bg-primary/5 text-primary"
                        : "border-muted hover:bg-muted/50"
                    )}
                  >
                    {freq.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Campos específicos por frequência */}
            {editFrequency === "weekly" && (
              <div className="grid gap-2">
                <Label>Dia da Semana</Label>
                <div className="grid grid-cols-7 gap-1">
                  {weekdays.map((day) => (
                    <button
                      key={day.value}
                      type="button"
                      onClick={() => setEditWeekday(day.value)}
                      className={cn(
                        "rounded-lg border py-2 text-xs font-medium transition-colors",
                        editWeekday === day.value
                          ? "border-primary bg-primary/5 text-primary"
                          : "border-muted hover:bg-muted/50"
                      )}
                    >
                      {day.short}
                    </button>
                  ))}
                </div>
                {editWeekday !== null && (
                  <p className="text-xs text-muted-foreground">
                    {getMonthlyValue().description}
                  </p>
                )}
              </div>
            )}

            {editFrequency === "yearly" && (
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-2">
                  <Label>Mês do Vencimento</Label>
                  <div className="grid grid-cols-4 gap-1">
                    {monthNamesFull.map((month, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setEditYearMonth(idx + 1)}
                        className={cn(
                          "rounded border py-1.5 text-[10px] font-medium transition-colors",
                          editYearMonth === idx + 1
                            ? "border-primary bg-primary/5 text-primary"
                            : "border-muted hover:bg-muted/50",
                          idx + 1 === currentMonth && editYearMonth !== idx + 1 && "bg-muted/30"
                        )}
                      >
                        {month}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="dueDayYearly">Dia</Label>
                  <Input
                    id="dueDayYearly"
                    type="number"
                    min="1"
                    max="31"
                    placeholder="Ex: 15"
                    value={editDueDay || ""}
                    onChange={(e) => setEditDueDay(e.target.value ? parseInt(e.target.value) : null)}
                  />
                  {editYearMonth && (
                    <p className="text-xs text-muted-foreground">
                      {editYearMonth === currentMonth
                        ? "Vence este mês!"
                        : `Vence em ${monthNamesFull[editYearMonth - 1]}`}
                    </p>
                  )}
                </div>
              </div>
            )}

            {(editFrequency === "monthly" || editFrequency === "once") && (
              <div className="grid gap-2">
                <Label htmlFor="dueDayMonthly">Dia do Vencimento</Label>
                <Input
                  id="dueDayMonthly"
                  type="number"
                  min="1"
                  max="31"
                  placeholder="Ex: 10"
                  value={editDueDay || ""}
                  onChange={(e) => setEditDueDay(e.target.value ? parseInt(e.target.value) : null)}
                />
                <p className="text-xs text-muted-foreground">
                  {editFrequency === "monthly"
                    ? "Este gasto se repete todo mês"
                    : "Este gasto é apenas para este mês"}
                </p>
              </div>
            )}

            {/* Tipo de Alocação - Lado a Lado */}
            <div className="grid gap-2">
              <Label>Sobra do mês</Label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setEditBehavior("refill_up")}
                  className={cn(
                    "flex flex-col items-start gap-0.5 rounded-lg border p-3 text-left transition-colors",
                    editBehavior === "refill_up"
                      ? "border-primary bg-primary/5"
                      : "border-muted hover:bg-muted/50"
                  )}
                >
                  <span className="font-medium text-sm">Zera</span>
                  <span className="text-[11px] text-muted-foreground leading-tight">
                    Reinicia todo mês
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setEditBehavior("set_aside")}
                  className={cn(
                    "flex flex-col items-start gap-0.5 rounded-lg border p-3 text-left transition-colors",
                    editBehavior === "set_aside"
                      ? "border-primary bg-primary/5"
                      : "border-muted hover:bg-muted/50"
                  )}
                >
                  <span className="font-medium text-sm">Acumula</span>
                  <span className="text-[11px] text-muted-foreground leading-tight">
                    Passa pro próximo
                  </span>
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                {editBehavior === "set_aside"
                  ? "Ideal para prazeres, viagens e metas de economia"
                  : "Ideal para gastos fixos como aluguel e contas"}
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingCategory(null)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveAllocation}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Category Modal */}
      <Dialog open={!!newCategoryGroupId} onOpenChange={(open) => !open && setNewCategoryGroupId(null)}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Nova Categoria</DialogTitle>
            <DialogDescription>
              Adicionar categoria em {selectedGroupForNewCategory?.icon} {selectedGroupForNewCategory?.name}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="categoryName">Nome</Label>
              <Input
                id="categoryName"
                placeholder="Ex: Netflix, Academia, Supermercado..."
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && newCategoryName.trim()) {
                    handleCreateCategory();
                  }
                }}
                autoFocus
              />
            </div>

            <div className="grid gap-2">
              <Label>Ícone {newCategoryIcon && <span className="ml-2 text-lg">{newCategoryIcon}</span>}</Label>

              {/* Emoji Category Tabs */}
              <div className="flex gap-1 border-b pb-1">
                {[
                  { id: "recent", icon: "🕐", label: "Recentes" },
                  { id: "food", icon: "🍔", label: "Comida" },
                  { id: "transport", icon: "🚗", label: "Transporte" },
                  { id: "home", icon: "🏠", label: "Casa" },
                  { id: "health", icon: "💪", label: "Saúde" },
                  { id: "entertainment", icon: "🎬", label: "Lazer" },
                  { id: "money", icon: "💰", label: "Dinheiro" },
                  { id: "other", icon: "📦", label: "Outros" },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setNewCategoryIconMode(tab.id as typeof newCategoryIconMode)}
                    className={cn(
                      "p-1.5 rounded text-lg hover:bg-muted/50 transition-colors",
                      newCategoryIconMode === tab.id && "bg-muted"
                    )}
                    title={tab.label}
                  >
                    {tab.icon}
                  </button>
                ))}
              </div>

              {/* Emoji Grid */}
              <div className="grid grid-cols-8 gap-1 max-h-[140px] overflow-y-auto p-1">
                {(newCategoryIconMode === "recent" ? [
                  "🛒", "🍽️", "⛽", "💡", "📱", "💳", "🏥", "🎬",
                ] : newCategoryIconMode === "food" ? [
                  "🛒", "🍽️", "☕", "🥖", "🥩", "🍕", "🍔", "🍺",
                  "🍷", "🍰", "🍦", "🥗", "🍜", "🍣", "🌮", "🥐",
                ] : newCategoryIconMode === "transport" ? [
                  "🚗", "⛽", "🚌", "🚇", "✈️", "🚕", "🏍️", "🚲",
                  "🅿️", "🔧", "🚙", "🛵", "⚓", "🚁", "🚀", "🛻",
                ] : newCategoryIconMode === "home" ? [
                  "🏠", "🏢", "💡", "💧", "🔥", "📶", "📱", "🧹",
                  "🛋️", "🛏️", "🚿", "🪴", "🔑", "🏗️", "🪟", "🚪",
                ] : newCategoryIconMode === "health" ? [
                  "💪", "🏥", "💊", "🦷", "🧠", "🏃", "🧘", "🥗",
                  "💉", "🩺", "🩹", "👓", "🧴", "💅", "💇", "🧖",
                ] : newCategoryIconMode === "entertainment" ? [
                  "🎬", "📺", "🎵", "🎮", "📚", "🎭", "🎨", "🎪",
                  "✈️", "🏨", "🏖️", "⛷️", "🎢", "🎡", "🎯", "🎲",
                ] : newCategoryIconMode === "money" ? [
                  "💰", "💳", "🏦", "📈", "💵", "🧾", "🛡️", "❤️",
                  "💎", "🪙", "📊", "💸", "🎁", "🏆", "⭐", "🎖️",
                ] : [
                  "📌", "👕", "👟", "🐕", "🐱", "👶", "🧸", "📖",
                  "✏️", "💼", "💻", "📦", "🔔", "⚙️", "🎓", "🌍",
                ]).map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => setNewCategoryIcon(emoji)}
                    className={cn(
                      "p-2 text-xl rounded hover:bg-muted/50 transition-colors",
                      newCategoryIcon === emoji && "bg-primary/10 ring-1 ring-primary"
                    )}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>

            {/* Behavior Selection */}
            <div className="grid gap-2">
              <Label>Sobra do mês</Label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setNewCategoryBehavior("refill_up")}
                  className={cn(
                    "flex flex-col items-start gap-0.5 rounded-lg border p-3 text-left transition-colors",
                    newCategoryBehavior === "refill_up"
                      ? "border-primary bg-primary/5"
                      : "border-muted hover:bg-muted/50"
                  )}
                >
                  <span className="font-medium text-sm">Zera</span>
                  <span className="text-[11px] text-muted-foreground leading-tight">
                    Reinicia todo mês
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setNewCategoryBehavior("set_aside")}
                  className={cn(
                    "flex flex-col items-start gap-0.5 rounded-lg border p-3 text-left transition-colors",
                    newCategoryBehavior === "set_aside"
                      ? "border-primary bg-primary/5"
                      : "border-muted hover:bg-muted/50"
                  )}
                >
                  <span className="font-medium text-sm">Acumula</span>
                  <span className="text-[11px] text-muted-foreground leading-tight">
                    Passa pro próximo
                  </span>
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                {newCategoryBehavior === "set_aside"
                  ? "Ideal para prazeres, viagens e metas de economia"
                  : "Ideal para gastos fixos como aluguel e contas"}
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setNewCategoryGroupId(null)} disabled={isCreatingCategory}>
              Cancelar
            </Button>
            <Button onClick={handleCreateCategory} disabled={isCreatingCategory || !newCategoryName.trim()}>
              {isCreatingCategory && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Criar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Category Modal */}
      <Dialog open={!!editCategoryData} onOpenChange={(open) => !open && setEditCategoryData(null)}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Editar Categoria</DialogTitle>
            <DialogDescription>
              Altere o nome ou ícone da categoria
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="editCategoryName">Nome</Label>
              <Input
                id="editCategoryName"
                placeholder="Nome da categoria"
                value={editCategoryName}
                onChange={(e) => setEditCategoryName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && editCategoryName.trim()) {
                    handleUpdateCategory();
                  }
                }}
                autoFocus
              />
            </div>

            <div className="grid gap-2">
              <Label>Ícone {editCategoryIcon && <span className="ml-2 text-lg">{editCategoryIcon}</span>}</Label>

              {/* Emoji Category Tabs */}
              <div className="flex gap-1 border-b pb-1">
                {[
                  { id: "recent", icon: "🕐", label: "Recentes" },
                  { id: "food", icon: "🍔", label: "Comida" },
                  { id: "transport", icon: "🚗", label: "Transporte" },
                  { id: "home", icon: "🏠", label: "Casa" },
                  { id: "health", icon: "💪", label: "Saúde" },
                  { id: "entertainment", icon: "🎬", label: "Lazer" },
                  { id: "money", icon: "💰", label: "Dinheiro" },
                  { id: "other", icon: "📦", label: "Outros" },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setEditCategoryIconMode(tab.id as typeof editCategoryIconMode)}
                    className={cn(
                      "p-1.5 rounded text-lg hover:bg-muted/50 transition-colors",
                      editCategoryIconMode === tab.id && "bg-muted"
                    )}
                    title={tab.label}
                  >
                    {tab.icon}
                  </button>
                ))}
              </div>

              {/* Emoji Grid */}
              <div className="grid grid-cols-8 gap-1 max-h-[140px] overflow-y-auto p-1">
                {(editCategoryIconMode === "recent" ? [
                  "🛒", "🍽️", "⛽", "💡", "📱", "💳", "🏥", "🎬",
                ] : editCategoryIconMode === "food" ? [
                  "🛒", "🍽️", "☕", "🥖", "🥩", "🍕", "🍔", "🍺",
                  "🍷", "🍰", "🍦", "🥗", "🍜", "🍣", "🌮", "🥐",
                ] : editCategoryIconMode === "transport" ? [
                  "🚗", "⛽", "🚌", "🚇", "✈️", "🚕", "🏍️", "🚲",
                  "🅿️", "🔧", "🚙", "🛵", "⚓", "🚁", "🚀", "🛻",
                ] : editCategoryIconMode === "home" ? [
                  "🏠", "🏢", "💡", "💧", "🔥", "📶", "📱", "🧹",
                  "🛋️", "🛏️", "🚿", "🪴", "🔑", "🏗️", "🪟", "🚪",
                ] : editCategoryIconMode === "health" ? [
                  "💪", "🏥", "💊", "🦷", "🧠", "🏃", "🧘", "🥗",
                  "💉", "🩺", "🩹", "👓", "🧴", "💅", "💇", "🧖",
                ] : editCategoryIconMode === "entertainment" ? [
                  "🎬", "📺", "🎵", "🎮", "📚", "🎭", "🎨", "🎪",
                  "✈️", "🏨", "🏖️", "⛷️", "🎢", "🎡", "🎯", "🎲",
                ] : editCategoryIconMode === "money" ? [
                  "💰", "💳", "🏦", "📈", "💵", "🧾", "🛡️", "❤️",
                  "💎", "🪙", "📊", "💸", "🎁", "🏆", "⭐", "🎖️",
                ] : [
                  "📌", "👕", "👟", "🐕", "🐱", "👶", "🧸", "📖",
                  "✏️", "💼", "💻", "📦", "🔔", "⚙️", "🎓", "🌍",
                ]).map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => setEditCategoryIcon(emoji)}
                    className={cn(
                      "p-2 text-xl rounded hover:bg-muted/50 transition-colors",
                      editCategoryIcon === emoji && "bg-primary/10 ring-1 ring-primary"
                    )}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditCategoryData(null)} disabled={isUpdatingCategory}>
              Cancelar
            </Button>
            <Button onClick={handleUpdateCategory} disabled={isUpdatingCategory || !editCategoryName.trim()}>
              {isUpdatingCategory && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Category Confirmation */}
      <AlertDialog open={!!deletingCategory} onOpenChange={(open) => !open && setDeletingCategory(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir categoria?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a categoria &quot;{deletingCategory?.name}&quot;?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingCategory}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteCategory}
              disabled={isDeletingCategory}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeletingCategory && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Copy Budget Confirmation */}
      <AlertDialog open={showCopyConfirm} onOpenChange={(open) => !open && setShowCopyConfirm(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Substituir alocações existentes?</AlertDialogTitle>
            <AlertDialogDescription>
              O mês de {monthNamesFull[currentMonth - 1]} já possui alocações configuradas.
              Deseja substituí-las pelas alocações de {monthNamesFull[getPreviousMonth().month - 1]}?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isCopyingBudget}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleCopyFromPreviousMonth(true)}
              disabled={isCopyingBudget}
            >
              {isCopyingBudget && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Substituir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Income Modal */}
      <Dialog open={!!editingIncome} onOpenChange={(open) => !open && setEditingIncome(null)}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span>{editingIncome?.incomeSource.type === "salary" ? "💼" : editingIncome?.incomeSource.type === "benefit" ? "🎁" : editingIncome?.incomeSource.type === "freelance" ? "💻" : "💵"}</span>
              <span>{editingIncome?.incomeSource.name}</span>
            </DialogTitle>
            <DialogDescription>
              Ajuste o valor previsto para {monthNamesFull[currentMonth - 1]} {currentYear}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Valor */}
            <div className="grid gap-2">
              <Label htmlFor="income-planned">Valor Previsto</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                  R$
                </span>
                <Input
                  id="income-planned"
                  className="pl-9"
                  placeholder="0,00"
                  value={editIncomeValue}
                  onChange={(e) => setEditIncomeValue(formatInputValue(e.target.value))}
                  onFocus={(e) => e.target.select()}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleSaveIncomeAllocation();
                    }
                  }}
                  autoFocus
                />
              </div>
              {editingIncome && editingIncome.planned !== editingIncome.defaultAmount && (
                <p className="text-xs text-muted-foreground">
                  Valor padrão: {formatCurrency(editingIncome.defaultAmount)}
                </p>
              )}
            </div>

            {/* Reset to default button */}
            {editingIncome && editingIncome.planned !== editingIncome.defaultAmount && (
              <Button
                variant="ghost"
                size="sm"
                className="justify-start text-muted-foreground"
                onClick={() => {
                  setEditIncomeValue((editingIncome.defaultAmount / 100).toFixed(2).replace(".", ","));
                }}
              >
                <Undo2 className="h-4 w-4 mr-2" />
                Restaurar valor padrão
              </Button>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingIncome(null)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveIncomeAllocation}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
