"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CurrencyInput } from "@/components/ui/currency-input";
import {
  ChevronDown,
  Loader2,
  Plus,
  Undo2,
  Redo2,
  PiggyBank,
  Pencil,
  Trash2,
  Copy,
  Target,
  ArrowRight,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { MonthSelector } from "@/components/ui/month-selector";
import Link from "next/link";
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
import { formatCurrency, formatCurrencyFromDigits } from "@/lib/formatters";
import { GoalFormModal } from "@/components/goals";
import { useTutorial } from "@/components/tutorial/tutorial-provider";
import { CategoryWithBills } from "@/components/budget/category-with-bills";

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

interface RecurringBillSummary {
  id: string;
  name: string;
  amount: number;
  frequency: string;
  dueDay: number | null;
  dueMonth: number | null;
  isAutoDebit?: boolean;
  isVariable?: boolean;
  account: { id: string; name: string; icon: string | null } | null;
}

interface CategoryAllocation {
  category: Category;
  allocated: number;
  carriedOver: number;
  spent: number;
  available: number;
  isOtherMemberCategory?: boolean; // True if category belongs to another member
  recurringBills?: RecurringBillSummary[];
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
  type: "salary" | "benefit" | "freelance" | "rental" | "investment" | "other";
  amount: number;
  frequency: "monthly" | "biweekly" | "weekly";
  dayOfMonth?: number | null;
  memberId: string | null;
  member?: { id: string; name: string; color?: string | null } | null;
  account?: { id: string; name: string; icon?: string | null } | null;
  isAutoConfirm?: boolean;
}

interface Account {
  id: string;
  name: string;
  type: string;
  icon?: string | null;
}

interface IncomeSourceFormData {
  name: string;
  type: "salary" | "benefit" | "freelance" | "rental" | "investment" | "other";
  amount: number;
  frequency: "monthly" | "biweekly" | "weekly";
  dayOfMonth?: number;
  memberId?: string;
  accountId?: string;
  isAutoConfirm?: boolean;
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

interface Goal {
  id: string;
  name: string;
  icon: string;
  color: string;
  targetAmount: number;
  currentAmount: number;
  progress: number;
  monthlyTarget: number;
  monthsRemaining: number;
  isCompleted: boolean;
}

type FilterType = "all" | "underfunded" | "overfunded" | "money_available";

const monthNamesFull = [
  "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
  "Jul", "Ago", "Set", "Out", "Nov", "Dez",
];

const incomeTypeConfig: Record<string, { label: string; icon: string }> = {
  salary: { label: "Salário", icon: "💼" },
  benefit: { label: "Benefício", icon: "🎁" },
  freelance: { label: "Freelance", icon: "💻" },
  rental: { label: "Aluguel", icon: "🏠" },
  investment: { label: "Investimento", icon: "📈" },
  other: { label: "Outros", icon: "📦" },
};

const frequencyLabels: Record<string, string> = {
  monthly: "Mensal",
  biweekly: "Quinzenal",
  weekly: "Semanal",
};

// Account types allowed for each income type
const ALLOWED_ACCOUNT_TYPES_BY_INCOME: Record<string, string[]> = {
  salary: ["checking", "savings"],
  freelance: ["checking", "savings"],
  rental: ["checking", "savings"],
  investment: ["checking", "savings", "investment"],
  benefit: ["benefit"],
  other: ["checking", "savings", "credit_card", "cash", "investment", "benefit"],
};

export default function BudgetPage() {
  const router = useRouter();
  const { notifyActionCompleted, isActive: isTutorialActive } = useTutorial();
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [groupsData, setGroupsData] = useState<GroupData[]>([]);
  const [totals, setTotals] = useState({ allocated: 0, spent: 0, available: 0 });
  const [incomeData, setIncomeData] = useState<IncomeData | null>(null);
  const [totalIncome, setTotalIncome] = useState(0);
  const [hasPreviousMonthData, setHasPreviousMonthData] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedGroups, setExpandedGroups] = useState<string[]>([]);
  const [expandedIncomeMembers, setExpandedIncomeMembers] = useState<string[]>([]);
  const [isIncomeExpanded, setIsIncomeExpanded] = useState(true);
  const [isExpensesExpanded, setIsExpensesExpanded] = useState(false);
  const [isGoalsExpanded, setIsGoalsExpanded] = useState(false);

  // Accordion toggle functions - close others when opening one
  const toggleIncomeSection = () => {
    const newState = !isIncomeExpanded;
    setIsIncomeExpanded(newState);
    if (newState) {
      setIsExpensesExpanded(false);
      setIsGoalsExpanded(false);
    }
  };

  const toggleExpensesSection = () => {
    const newState = !isExpensesExpanded;
    setIsExpensesExpanded(newState);
    if (newState) {
      setIsIncomeExpanded(false);
      setIsGoalsExpanded(false);
    }
  };

  const toggleGoalsSection = () => {
    const newState = !isGoalsExpanded;
    setIsGoalsExpanded(newState);
    if (newState) {
      setIsIncomeExpanded(false);
      setIsExpensesExpanded(false);
    }
  };
  const [goals, setGoals] = useState<Goal[]>([]);
  const [isGoalFormOpen, setIsGoalFormOpen] = useState(false);
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
  const [showCopyHintModal, setShowCopyHintModal] = useState(false);
  const [copyMode, setCopyMode] = useState<"all" | "empty_only" | null>(null);

  // Edit income allocation (monthly value)
  const [editingIncome, setEditingIncome] = useState<{
    incomeSource: IncomeSource;
    planned: number;
    defaultAmount: number;
  } | null>(null);
  const [editIncomeValue, setEditIncomeValue] = useState("");

  // Income source CRUD
  const [members, setMembers] = useState<Member[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isIncomeSourceFormOpen, setIsIncomeSourceFormOpen] = useState(false);
  const [editingIncomeSource, setEditingIncomeSource] = useState<IncomeSource | null>(null);
  const [deletingIncomeSource, setDeletingIncomeSource] = useState<IncomeSource | null>(null);
  const [isSubmittingIncomeSource, setIsSubmittingIncomeSource] = useState(false);
  const [incomeSourceFormData, setIncomeSourceFormData] = useState<IncomeSourceFormData>({
    name: "",
    type: "salary",
    amount: 0,
    frequency: "monthly",
    dayOfMonth: undefined,
    memberId: undefined,
    accountId: undefined,
    isAutoConfirm: false,
  });
  const [incomeSourceFormErrors, setIncomeSourceFormErrors] = useState<Record<string, boolean>>({});

  const today = new Date();
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth() + 1);

  const fetchData = useCallback(async () => {
    try {
      const [budgetsRes, membersRes, accountsRes] = await Promise.all([
        fetch("/api/app/budgets"),
        fetch("/api/app/members"),
        fetch("/api/app/accounts"),
      ]);

      if (membersRes.ok) {
        const data = await membersRes.json();
        setMembers(data.members || []);
      }

      if (accountsRes.ok) {
        const data = await accountsRes.json();
        setAccounts(data.accounts || []);
      }

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
            setHasPreviousMonthData(allocData.hasPreviousMonthData || false);

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

          // Fetch goals
          const goalsRes = await fetch(`/api/app/goals?budgetId=${data.budgets[0].id}`);
          if (goalsRes.ok) {
            const goalsData = await goalsRes.json();
            setGoals(goalsData.goals?.filter((g: Goal) => !g.isCompleted) || []);
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

  // Show copy hint modal when no allocations exist for current month AND previous month has data
  useEffect(() => {
    if (isLoading || groupsData.length === 0) return;

    const hasAllocations = totals.allocated > 0;
    if (hasAllocations) return;

    // Only show hint if previous month has data to copy
    if (!hasPreviousMonthData) return;

    // Check if user dismissed this hint for this specific month
    const dismissedKey = `copy-hint-dismissed-${currentYear}-${currentMonth}`;
    const wasDismissed = localStorage.getItem(dismissedKey);

    if (!wasDismissed) {
      setShowCopyHintModal(true);
    }
  }, [isLoading, groupsData.length, totals.allocated, currentYear, currentMonth, hasPreviousMonthData]);

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

  const handleMonthChange = (year: number, month: number) => {
    setCurrentYear(year);
    setCurrentMonth(month);
  };

  const openEditModal = (category: Category, allocated: number) => {
    setEditingCategory({ category, allocated });
    setEditValue((allocated / 100).toFixed(2).replace(".", ","));
    setEditBehavior(category.behavior);
    setEditFrequency("monthly");
    setEditDueDay(null);
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
      // Save allocation
      const allocationResponse = await fetch("/api/app/allocations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          budgetId: budgets[0].id,
          categoryId: editingCategory.category.id,
          year: currentYear,
          month: currentMonth,
          allocated: newValue,
        }),
      });

      if (!allocationResponse.ok) {
        throw new Error("Erro ao atualizar alocação");
      }

      // Update category behavior if changed
      const categoryUpdates: Record<string, unknown> = {};
      if (editBehavior !== editingCategory.category.behavior) {
        categoryUpdates.behavior = editBehavior;
      }

      if (Object.keys(categoryUpdates).length > 0) {
        const categoryResponse = await fetch(`/api/app/categories/${editingCategory.category.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(categoryUpdates),
        });

        if (!categoryResponse.ok) {
          console.error("Failed to update category:", await categoryResponse.text());
        }
      }

      toast.success("Alocação atualizada!");
      setEditingCategory(null);
      fetchData();

      // Notify tutorial that user made an allocation
      if (isTutorialActive) {
        notifyActionCompleted("hasAllocations");
      }
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

  // Income source CRUD functions
  const filteredAccounts = useMemo(() => {
    const allowedTypes = ALLOWED_ACCOUNT_TYPES_BY_INCOME[incomeSourceFormData.type] || [];
    return accounts.filter((account) => allowedTypes.includes(account.type));
  }, [accounts, incomeSourceFormData.type]);

  const openCreateIncomeSourceForm = (preselectedMemberId?: string) => {
    setIncomeSourceFormData({
      name: "",
      type: "salary",
      amount: 0,
      frequency: "monthly",
      dayOfMonth: undefined,
      memberId: preselectedMemberId || members[0]?.id,
      accountId: undefined,
      isAutoConfirm: false,
    });
    setEditingIncomeSource(null);
    setIncomeSourceFormErrors({});
    setIsIncomeSourceFormOpen(true);
  };

  const openEditIncomeSourceForm = (source: IncomeSource) => {
    setIncomeSourceFormData({
      name: source.name,
      type: source.type,
      amount: source.amount,
      frequency: source.frequency,
      dayOfMonth: source.dayOfMonth || undefined,
      memberId: source.member?.id || source.memberId || undefined,
      accountId: source.account?.id,
      isAutoConfirm: source.isAutoConfirm || false,
    });
    setEditingIncomeSource(source);
    setIncomeSourceFormErrors({});
    setIsIncomeSourceFormOpen(true);
  };

  const validateIncomeSourceForm = (): boolean => {
    const newErrors: Record<string, boolean> = {};

    if (!incomeSourceFormData.name.trim()) {
      newErrors.name = true;
    }

    if (incomeSourceFormData.amount <= 0) {
      newErrors.amount = true;
    }

    setIncomeSourceFormErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmitIncomeSource = async () => {
    if (!validateIncomeSourceForm()) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    if (budgets.length === 0) {
      toast.error("Nenhum orçamento encontrado");
      return;
    }

    setIsSubmittingIncomeSource(true);
    try {
      const payload = {
        ...incomeSourceFormData,
        budgetId: budgets[0].id,
      };

      if (editingIncomeSource) {
        const response = await fetch(`/api/app/income-sources/${editingIncomeSource.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          throw new Error("Erro ao atualizar fonte de renda");
        }

        toast.success("Fonte de renda atualizada!");
      } else {
        const response = await fetch("/api/app/income-sources", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          throw new Error("Erro ao criar fonte de renda");
        }

        toast.success("Fonte de renda adicionada!");
      }

      setIsIncomeSourceFormOpen(false);
      setEditingIncomeSource(null);
      setIncomeSourceFormErrors({});
      fetchData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao salvar");
    } finally {
      setIsSubmittingIncomeSource(false);
    }
  };

  const handleDeleteIncomeSource = async () => {
    if (!deletingIncomeSource) return;

    try {
      const response = await fetch(`/api/app/income-sources/${deletingIncomeSource.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Erro ao excluir fonte de renda");
      }

      toast.success("Fonte de renda removida!");
      setDeletingIncomeSource(null);
      fetchData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao excluir");
    }
  };

  // Get previous month
  const getPreviousMonth = () => {
    if (currentMonth === 1) {
      return { year: currentYear - 1, month: 12 };
    }
    return { year: currentYear, month: currentMonth - 1 };
  };

  const dismissCopyHintModal = () => {
    const dismissedKey = `copy-hint-dismissed-${currentYear}-${currentMonth}`;
    localStorage.setItem(dismissedKey, "true");
    setShowCopyHintModal(false);
  };

  const handleCopyFromPreviousMonth = async (mode: "all" | "empty_only" = "all") => {
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
          mode, // "all" or "empty_only"
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.requiresConfirm) {
          setShowCopyConfirm(true);
          setCopyMode(null);
          return;
        }
        throw new Error(data.error || "Erro ao copiar orçamento");
      }

      toast.success(`${data.copiedCount} alocações copiadas de ${monthNamesFull[prev.month - 1]}!`);
      setShowCopyConfirm(false);
      setCopyMode(null);
      fetchData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao copiar orçamento");
    } finally {
      setIsCopyingBudget(false);
    }
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
        // Categorias sem alocação OU com menos que o planejado
        return categories.filter((c) =>
          c.allocated === 0 ||
          (c.category.plannedAmount > 0 && c.allocated < c.category.plannedAmount)
        );
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
          <MonthSelector
            year={currentYear}
            month={currentMonth}
            onChange={handleMonthChange}
          />

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
            {hasPreviousMonthData && (
              <button
                className="px-2 py-1 rounded hover:bg-muted flex items-center gap-1 disabled:opacity-50"
                onClick={() => {
                  // If there are existing allocations, show the options modal
                  if (totals.allocated > 0) {
                    setShowCopyConfirm(true);
                  } else {
                    // No allocations, just copy everything
                    handleCopyFromPreviousMonth("all");
                  }
                }}
                disabled={isCopyingBudget}
                title={`Copiar orçamento de ${monthNamesFull[getPreviousMonth().month - 1]}`}
              >
                {isCopyingBudget ? <Loader2 className="h-3 w-3 animate-spin" /> : <Copy className="h-3 w-3" />}
                <span className="hidden sm:inline">Copiar de {monthNamesFull[getPreviousMonth().month - 1]}</span>
              </button>
            )}
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
        {/* Income Section */}
        {incomeData && incomeData.byMember.length > 0 && (
          <div className="border-b-4 border-green-200 dark:border-green-900">
            {/* Income Section Header - Clickable Toggle */}
            <div
              className="group px-4 py-2 bg-green-100 dark:bg-green-950/50 border-b flex items-center justify-between cursor-pointer hover:bg-green-200/50 dark:hover:bg-green-950/70 transition-colors"
              onClick={toggleIncomeSection}
            >
              <div className="flex items-center gap-2">
                <ChevronDown className={cn("h-4 w-4 text-green-700 dark:text-green-300 transition-transform", !isIncomeExpanded && "-rotate-90")} />
                <span className="text-lg">💰</span>
                <span className="font-bold text-sm text-green-800 dark:text-green-200">RECEITAS</span>
                <button
                  className="ml-1 p-0.5 rounded hover:bg-green-200 dark:hover:bg-green-800 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => {
                    e.stopPropagation();
                    openCreateIncomeSourceForm();
                  }}
                  title="Adicionar fonte de renda"
                >
                  <Plus className="h-3.5 w-3.5 text-green-700 dark:text-green-300" />
                </button>
              </div>
              <div className="flex items-center gap-4 text-sm font-bold text-green-800 dark:text-green-200">
                <span className="text-xs text-muted-foreground font-normal">Planejado:</span>
                <span>{formatCurrency(incomeData.totals.planned)}</span>
                <span className="text-xs text-muted-foreground font-normal">Recebido:</span>
                <span className="text-green-600 dark:text-green-400">{formatCurrency(incomeData.totals.received)}</span>
                <span className="text-xs text-muted-foreground font-normal">
                  {incomeData.totals.received < incomeData.totals.planned ? "A Receber:" : "Extra:"}
                </span>
                <span className={incomeData.totals.received < incomeData.totals.planned ? "text-red-600" : "text-green-600"}>
                  {formatCurrency(Math.abs(incomeData.totals.planned - incomeData.totals.received))}
                </span>
              </div>
            </div>

            {isIncomeExpanded && (
              <div className="overflow-x-auto">
                <div className="min-w-[550px]">
                {/* Income Table Header */}
                <div className="grid grid-cols-[24px_1fr_100px_100px_110px] px-4 py-1.5 text-[11px] font-medium text-muted-foreground uppercase border-b bg-green-50/50 dark:bg-green-950/20">
                  <div />
                  <div>Fonte</div>
                  <div className="text-right">Planejado</div>
                  <div className="text-right">Recebido</div>
                  <div className="text-right">A Receber</div>
                </div>

                {/* If only one member (or no member), show sources directly */}
                {incomeData.byMember.length === 1 ? (
              incomeData.byMember[0].sources.map((item) => {
                const isEdited = item.planned !== item.defaultAmount;
                const available = item.planned - item.received;
                return (
                  <div
                    key={item.incomeSource.id}
                    className="group/row grid grid-cols-[24px_1fr_100px_100px_110px] px-4 py-1.5 items-center border-b hover:bg-green-50/50 dark:hover:bg-green-950/20 text-sm cursor-pointer"
                    onClick={() => openEditIncomeModal(item)}
                  >
                    <div />
                    <div className="flex items-center gap-1.5 pl-5">
                      <span>{incomeTypeConfig[item.incomeSource.type]?.icon || "💵"}</span>
                      <span>{item.incomeSource.name}</span>
                      <span className="text-[10px] text-muted-foreground bg-muted px-1 rounded">
                        {frequencyLabels[item.incomeSource.frequency] || "Mensal"}
                      </span>
                      {isEdited && (
                        <span className="text-[10px] text-amber-600 bg-amber-100 dark:bg-amber-900/30 px-1 rounded">
                          editado
                        </span>
                      )}
                      <div className="flex items-center gap-0.5 ml-1 opacity-0 group-hover/row:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openEditIncomeSourceForm(item.incomeSource as IncomeSource);
                          }}
                          className="p-1 rounded hover:bg-green-200 dark:hover:bg-green-800"
                          title="Editar fonte de renda"
                        >
                          <Pencil className="h-3 w-3 text-muted-foreground" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeletingIncomeSource(item.incomeSource as IncomeSource);
                          }}
                          className="p-1 rounded hover:bg-destructive/10"
                          title="Excluir fonte de renda"
                        >
                          <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                        </button>
                      </div>
                    </div>
                    <div className="text-right text-xs tabular-nums">{formatCurrency(item.planned)}</div>
                    <div className="text-right text-xs tabular-nums text-green-600 dark:text-green-400">{formatCurrency(item.received)}</div>
                    <div className={cn("text-right text-xs tabular-nums", item.received < item.planned ? "text-red-600" : "text-green-600")}>
                      {formatCurrency(Math.abs(available))}
                    </div>
                  </div>
                );
              })
            ) : (
              /* Multiple members - show with collapsible sections */
              incomeData.byMember.map((memberGroup) => {
                const memberId = memberGroup.member?.id || "no-member";
                const isExpanded = expandedIncomeMembers.includes(memberId);
                const memberAvailable = memberGroup.totals.planned - memberGroup.totals.received;

                return (
                  <div key={memberId}>
                    {/* Member Row */}
                    <div
                      className="group grid grid-cols-[24px_1fr_100px_100px_110px] px-4 py-1.5 items-center bg-green-50/50 dark:bg-green-950/20 border-b cursor-pointer hover:bg-green-100/50 dark:hover:bg-green-950/40 text-sm"
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
                        <button
                          className="ml-1 p-0.5 rounded hover:bg-green-200 dark:hover:bg-green-800 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => {
                            e.stopPropagation();
                            openCreateIncomeSourceForm(memberGroup.member?.id);
                          }}
                          title={`Adicionar fonte de renda para ${memberGroup.member?.name || "sem responsável"}`}
                        >
                          <Plus className="h-3.5 w-3.5 text-green-700 dark:text-green-300" />
                        </button>
                      </div>
                      <div className="text-right text-xs tabular-nums font-bold">{formatCurrency(memberGroup.totals.planned)}</div>
                      <div className="text-right text-xs tabular-nums font-bold text-green-600 dark:text-green-400">{formatCurrency(memberGroup.totals.received)}</div>
                      <div className={cn("text-right text-xs tabular-nums font-bold", memberGroup.totals.received < memberGroup.totals.planned ? "text-red-600" : "text-green-600")}>
                        {formatCurrency(Math.abs(memberAvailable))}
                      </div>
                    </div>

                    {/* Income Sources for this member */}
                    {isExpanded && memberGroup.sources.map((item) => {
                      const isEdited = item.planned !== item.defaultAmount;
                      const available = item.planned - item.received;
                      return (
                        <div
                          key={item.incomeSource.id}
                          className="group/row grid grid-cols-[24px_1fr_100px_100px_110px] px-4 py-1.5 items-center border-b hover:bg-green-50/50 dark:hover:bg-green-950/20 text-sm cursor-pointer"
                          onClick={() => openEditIncomeModal(item)}
                        >
                          <div />
                          <div className="flex items-center gap-1.5 pl-10">
                            <span>{incomeTypeConfig[item.incomeSource.type]?.icon || "💵"}</span>
                            <span>{item.incomeSource.name}</span>
                            <span className="text-[10px] text-muted-foreground bg-muted px-1 rounded">
                              {frequencyLabels[item.incomeSource.frequency] || "Mensal"}
                            </span>
                            {isEdited && (
                              <span className="text-[10px] text-amber-600 bg-amber-100 dark:bg-amber-900/30 px-1 rounded">
                                editado
                              </span>
                            )}
                            <div className="flex items-center gap-0.5 ml-1 opacity-0 group-hover/row:opacity-100 transition-opacity">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openEditIncomeSourceForm(item.incomeSource as IncomeSource);
                                }}
                                className="p-1 rounded hover:bg-green-200 dark:hover:bg-green-800"
                                title="Editar fonte de renda"
                              >
                                <Pencil className="h-3 w-3 text-muted-foreground" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDeletingIncomeSource(item.incomeSource as IncomeSource);
                                }}
                                className="p-1 rounded hover:bg-destructive/10"
                                title="Excluir fonte de renda"
                              >
                                <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                              </button>
                            </div>
                          </div>
                          <div className="text-right text-xs tabular-nums">{formatCurrency(item.planned)}</div>
                          <div className="text-right text-xs tabular-nums text-green-600 dark:text-green-400">{formatCurrency(item.received)}</div>
                          <div className={cn("text-right text-xs tabular-nums", item.received < item.planned ? "text-red-600" : "text-green-600")}>
                            {formatCurrency(Math.abs(available))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })
            )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Expenses Section */}
        {groupsData.length > 0 && (
          <>
            {/* Expenses Section Header - Clickable Toggle */}
            <div
              className="px-4 py-2 bg-red-100 dark:bg-red-950/50 border-b flex items-center justify-between cursor-pointer hover:bg-red-200/50 dark:hover:bg-red-950/70 transition-colors"
              onClick={toggleExpensesSection}
            >
              <div className="flex items-center gap-2">
                <ChevronDown className={cn("h-4 w-4 text-red-700 dark:text-red-300 transition-transform", !isExpensesExpanded && "-rotate-90")} />
                <span className="text-lg">💸</span>
                <span className="font-bold text-sm text-red-800 dark:text-red-200">DESPESAS</span>
              </div>
              <div className="flex items-center gap-4 text-sm font-bold text-red-800 dark:text-red-200">
                <span className="text-xs text-muted-foreground font-normal">Alocado:</span>
                <span>{formatCurrency(totals.allocated)}</span>
                <span className="text-xs text-muted-foreground font-normal">Gasto:</span>
                <span className="text-red-600 dark:text-red-400">{formatCurrency(totals.spent)}</span>
                <span className="text-xs text-muted-foreground font-normal">Disponível:</span>
                <span className={totals.allocated - totals.spent >= 0 ? "" : "text-red-600"}>{formatCurrency(totals.allocated - totals.spent)}</span>
              </div>
            </div>

            {isExpensesExpanded && (
              <div className="overflow-x-auto">
                <div className="min-w-[550px]">
                {/* Expenses Table Header */}
                <div className="grid grid-cols-[24px_1fr_100px_100px_110px] px-4 py-1.5 text-[11px] font-medium text-muted-foreground uppercase border-b bg-muted/50">
                  <div />
                  <div>Categoria</div>
                  <div className="text-right">Alocado</div>
                  <div className="text-right">Gasto</div>
                  <div className="text-right">Disponível</div>
                </div>
                </div>
              </div>
            )}
          </>
        )}

        {groupsData.length > 0 && isExpensesExpanded ? (
          <div className="overflow-x-auto">
            <div className="min-w-[550px]">
          {groupsData.map(({ group, categories, totals: groupTotals }) => {
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
                  const isOtherMember = item.isOtherMemberCategory;

                  // For other member categories, show simple read-only row
                  if (isOtherMember) {
                    return (
                      <div
                        key={item.category.id}
                        className="grid grid-cols-[24px_1fr_100px_100px_110px] px-4 py-1.5 items-center border-b text-sm opacity-75 cursor-default"
                        data-tutorial="category-row"
                      >
                        <div className="h-3.5 w-3.5" />
                        <div className="flex items-center gap-1.5 pl-5">
                          <span>{item.category.icon || "📌"}</span>
                          <span>{item.category.name}</span>
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
                  }

                  // For own categories, use CategoryWithBills component
                  return (
                    <CategoryWithBills
                      key={item.category.id}
                      item={item}
                      budgetId={budgets[0]?.id || ""}
                      accounts={accounts}
                      isSelected={isSelected}
                      onToggleSelection={() => toggleCategorySelection(item.category.id)}
                      onEditAllocation={openEditModal}
                      onEditCategory={openEditCategoryModal}
                      onDeleteCategory={setDeletingCategory}
                      onBillsChange={fetchData}
                    />
                  );
                })}
              </div>
            );
          })}
            </div>
          </div>
        ) : groupsData.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <PiggyBank className="h-12 w-12 text-muted-foreground" />
            <h3 className="font-semibold">Nenhuma categoria configurada</h3>
            <Button onClick={() => router.push("/app/categories/setup")}>Configurar Categorias</Button>
          </div>
        ) : null}

        {/* Goals Section */}
        <div className="border-b" data-tutorial="goals-group">
          {/* Goals Section Header - Clickable Toggle */}
          <div
            className="group px-4 py-2 bg-violet-100 dark:bg-violet-950/50 border-b flex items-center justify-between cursor-pointer hover:bg-violet-200/50 dark:hover:bg-violet-950/70 transition-colors"
            onClick={toggleGoalsSection}
          >
            <div className="flex items-center gap-2">
              <ChevronDown className={cn("h-4 w-4 text-violet-700 dark:text-violet-300 transition-transform", !isGoalsExpanded && "-rotate-90")} />
              <Target className="h-4 w-4 text-violet-700 dark:text-violet-300" />
              <span className="font-bold text-sm text-violet-800 dark:text-violet-200">METAS</span>
              <button
                className="ml-1 p-0.5 rounded hover:bg-violet-200 dark:hover:bg-violet-800 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsGoalFormOpen(true);
                }}
                title="Adicionar meta"
              >
                <Plus className="h-3.5 w-3.5 text-violet-700 dark:text-violet-300" />
              </button>
            </div>
            <div className="flex items-center gap-2 text-sm">
              {goals.length > 0 && (
                <>
                  <span className="text-xs text-muted-foreground font-normal">Mensal sugerido:</span>
                  <span className="font-bold text-violet-800 dark:text-violet-200">
                    {formatCurrency(goals.reduce((sum, g) => sum + g.monthlyTarget, 0))}
                  </span>
                </>
              )}
            </div>
          </div>

          {isGoalsExpanded && goals.length > 0 && (
            <div className="overflow-x-auto">
              <div className="min-w-[550px]">
              {/* Goals Table Header */}
              <div className="grid grid-cols-[24px_1fr_100px_100px_110px] px-4 py-1.5 text-[11px] font-medium text-muted-foreground uppercase border-b bg-muted/50">
                <div />
                <div>Meta</div>
                <div className="text-right">Progresso</div>
                <div className="text-right">Mensal</div>
                <div className="text-right">Restante</div>
              </div>

              {/* Goals Rows */}
              {goals.map((goal) => (
                <Link
                  key={goal.id}
                  href="/app/goals"
                  className="grid grid-cols-[24px_1fr_100px_100px_110px] px-4 py-2 items-center border-b hover:bg-muted/20 text-sm cursor-pointer"
                >
                  <div className="flex items-center justify-center">
                    <span className="text-base">{goal.icon}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{goal.name}</span>
                    <div className="flex-1 max-w-[120px]">
                      <Progress
                        value={goal.progress}
                        className="h-1.5"
                        style={{ "--progress-background": goal.color } as React.CSSProperties}
                      />
                    </div>
                  </div>
                  <div className="text-right text-xs tabular-nums text-violet-600 dark:text-violet-400">
                    {goal.progress}%
                  </div>
                  <div className="text-right text-xs tabular-nums font-medium">
                    {formatCurrency(goal.monthlyTarget)}
                  </div>
                  <div className="text-right text-xs tabular-nums text-muted-foreground">
                    {goal.monthsRemaining > 0
                      ? `${goal.monthsRemaining} ${goal.monthsRemaining === 1 ? "mês" : "meses"}`
                      : "Vencida"}
                  </div>
                </Link>
              ))}
              </div>
            </div>
          )}

          {/* Empty state for goals */}
          {isGoalsExpanded && goals.length === 0 && (
            <div className="p-6 text-center text-muted-foreground">
              <Target className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Nenhuma meta criada ainda</p>
              <button
                onClick={() => setIsGoalFormOpen(true)}
                className="mt-2 text-sm text-violet-600 dark:text-violet-400 hover:underline"
              >
                Criar sua primeira meta
              </button>
            </div>
          )}
        </div>

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
                  onChange={(e) => setEditValue(formatCurrencyFromDigits(e.target.value))}
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

          <DialogFooter className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setEditingCategory(null)} className="w-1/4">
              Cancelar
            </Button>
            <Button onClick={handleSaveAllocation} className="w-1/4">
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

          <DialogFooter className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setNewCategoryGroupId(null)} disabled={isCreatingCategory} className="w-1/4">
              Cancelar
            </Button>
            <Button onClick={handleCreateCategory} disabled={isCreatingCategory || !newCategoryName.trim()} className="w-1/4">
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

          <DialogFooter className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setEditCategoryData(null)} disabled={isUpdatingCategory} className="w-1/4">
              Cancelar
            </Button>
            <Button onClick={handleUpdateCategory} disabled={isUpdatingCategory || !editCategoryName.trim()} className="w-1/4">
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

      {/* Copy Budget Confirmation with Options */}
      <Dialog open={showCopyConfirm} onOpenChange={(open) => { if (!open) { setShowCopyConfirm(false); setCopyMode(null); } }}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Copy className="h-5 w-5 text-primary" />
              Copiar do mês anterior
            </DialogTitle>
            <DialogDescription>
              O mês de {monthNamesFull[currentMonth - 1]} já possui algumas alocações.
              Como você deseja copiar os valores de {monthNamesFull[getPreviousMonth().month - 1]}?
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-3 py-4">
            <button
              type="button"
              className={cn(
                "flex items-start gap-3 p-3 rounded-lg border text-left transition-colors",
                copyMode === "all" ? "border-primary bg-primary/5" : "border-muted hover:bg-muted/50"
              )}
              onClick={() => setCopyMode("all")}
            >
              <Copy className="h-4 w-4 mt-0.5 text-muted-foreground" />
              <div>
                <div className="font-medium text-sm">Copiar todos os valores</div>
                <div className="text-xs text-muted-foreground">
                  Sobrescreve todo o planejamento existente
                </div>
              </div>
            </button>

            <button
              type="button"
              className={cn(
                "flex items-start gap-3 p-3 rounded-lg border text-left transition-colors",
                copyMode === "empty_only" ? "border-primary bg-primary/5" : "border-muted hover:bg-muted/50"
              )}
              onClick={() => setCopyMode("empty_only")}
            >
              <Plus className="h-4 w-4 mt-0.5 text-muted-foreground" />
              <div>
                <div className="font-medium text-sm">Copiar somente para o que está vazio</div>
                <div className="text-xs text-muted-foreground">
                  Mantém valores já planejados
                </div>
              </div>
            </button>
          </div>

          <DialogFooter className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => { setShowCopyConfirm(false); setCopyMode(null); }} disabled={isCopyingBudget}>
              Cancelar
            </Button>
            <Button
              onClick={() => copyMode && handleCopyFromPreviousMonth(copyMode)}
              disabled={!copyMode || isCopyingBudget}
            >
              {isCopyingBudget && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
                  onChange={(e) => setEditIncomeValue(formatCurrencyFromDigits(e.target.value))}
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

          <DialogFooter className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setEditingIncome(null)} className="w-1/4">
              Cancelar
            </Button>
            <Button onClick={handleSaveIncomeAllocation} className="w-1/4">
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Copy Hint Modal - shown when no allocations for current month */}
      <Dialog open={showCopyHintModal} onOpenChange={(open) => !open && dismissCopyHintModal()}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Copy className="h-5 w-5 text-primary" />
              Copiar planejamento anterior
            </DialogTitle>
            <DialogDescription>
              Parece que {monthNamesFull[currentMonth - 1]} ainda não tem um planejamento definido.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              Você pode copiar o planejamento de{" "}
              <span className="font-medium text-foreground">
                {monthNamesFull[getPreviousMonth().month - 1]}
              </span>{" "}
              para começar rapidamente, ou definir os valores manualmente clicando em cada categoria.
            </p>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={dismissCopyHintModal} className="w-full sm:w-auto">
              Fazer manualmente
            </Button>
            <Button
              onClick={() => {
                dismissCopyHintModal();
                handleCopyFromPreviousMonth();
              }}
              disabled={isCopyingBudget}
              className="w-full sm:w-auto"
            >
              {isCopyingBudget ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Copy className="mr-2 h-4 w-4" />
              )}
              Copiar de {monthNamesFull[getPreviousMonth().month - 1]}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create/Edit Income Source Modal */}
      <Dialog open={isIncomeSourceFormOpen} onOpenChange={(open) => !open && setIsIncomeSourceFormOpen(false)}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle>
              {editingIncomeSource ? "Editar Fonte de Renda" : "Nova Fonte de Renda"}
            </DialogTitle>
            <DialogDescription>
              {editingIncomeSource
                ? "Altere os dados da fonte de renda"
                : "Adicione uma nova fonte de renda ao seu planejamento"}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Nome */}
            <div className="grid gap-2">
              <Label htmlFor="incomeSourceName">Nome *</Label>
              <Input
                id="incomeSourceName"
                placeholder="Ex: Salário, Freelance, Aluguel..."
                value={incomeSourceFormData.name}
                onChange={(e) => setIncomeSourceFormData(prev => ({ ...prev, name: e.target.value }))}
                className={incomeSourceFormErrors.name ? "border-destructive" : ""}
                autoFocus
              />
              {incomeSourceFormErrors.name && (
                <p className="text-xs text-destructive">{incomeSourceFormErrors.name}</p>
              )}
            </div>

            {/* Tipo e Frequência em 2 colunas */}
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Tipo *</Label>
                <Select
                  value={incomeSourceFormData.type}
                  onValueChange={(value) => setIncomeSourceFormData(prev => ({ ...prev, type: value as IncomeSourceFormData["type"], accountId: "" }))}
                >
                  <SelectTrigger className={incomeSourceFormErrors.type ? "border-destructive" : ""}>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(incomeTypeConfig).map(([key, config]) => (
                      <SelectItem key={key} value={key}>
                        <span className="flex items-center gap-2">
                          <span>{config.icon}</span>
                          <span>{config.label}</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {incomeSourceFormErrors.type && (
                  <p className="text-xs text-destructive">{incomeSourceFormErrors.type}</p>
                )}
              </div>

              <div className="grid gap-2">
                <Label>Frequência *</Label>
                <Select
                  value={incomeSourceFormData.frequency}
                  onValueChange={(value) => setIncomeSourceFormData(prev => ({ ...prev, frequency: value as IncomeSourceFormData["frequency"] }))}
                >
                  <SelectTrigger className={incomeSourceFormErrors.frequency ? "border-destructive" : ""}>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(frequencyLabels).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {incomeSourceFormErrors.frequency && (
                  <p className="text-xs text-destructive">{incomeSourceFormErrors.frequency}</p>
                )}
              </div>
            </div>

            {/* Valor e Dia do Pagamento em 2 colunas */}
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Valor *</Label>
                <CurrencyInput
                  value={incomeSourceFormData.amount}
                  onChange={(value) => setIncomeSourceFormData(prev => ({ ...prev, amount: value }))}
                  className={incomeSourceFormErrors.amount ? "border-destructive" : ""}
                />
                {incomeSourceFormErrors.amount && (
                  <p className="text-xs text-destructive">{incomeSourceFormErrors.amount}</p>
                )}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="incomeSourceDayOfMonth">Dia do Pagamento</Label>
                <Input
                  id="incomeSourceDayOfMonth"
                  type="number"
                  min="1"
                  max="31"
                  placeholder="1-31"
                  value={incomeSourceFormData.dayOfMonth || ""}
                  onChange={(e) => {
                    const val = e.target.value ? parseInt(e.target.value) : undefined;
                    setIncomeSourceFormData(prev => ({ ...prev, dayOfMonth: val }));
                  }}
                />
              </div>
            </div>

            {/* Responsável */}
            {members.length > 1 && (
              <div className="grid gap-2">
                <Label>Quem Recebe</Label>
                <Select
                  value={incomeSourceFormData.memberId || "none"}
                  onValueChange={(value) => setIncomeSourceFormData(prev => ({ ...prev, memberId: value === "none" ? undefined : value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum responsável específico</SelectItem>
                    {members.map((member) => (
                      <SelectItem key={member.id} value={member.id}>
                        <span className="flex items-center gap-2">
                          <span
                            className="h-2.5 w-2.5 rounded-full"
                            style={{ backgroundColor: member.color || "#6366f1" }}
                          />
                          <span>{member.name}</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Conta de Destino */}
            {filteredAccounts.length > 0 && (
              <div className="grid gap-2">
                <Label>Conta de Destino</Label>
                <Select
                  value={incomeSourceFormData.accountId || "none"}
                  onValueChange={(value) => setIncomeSourceFormData(prev => ({ ...prev, accountId: value === "none" ? undefined : value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhuma conta específica</SelectItem>
                    {filteredAccounts.map((account) => (
                      <SelectItem key={account.id} value={account.id}>
                        <span className="flex items-center gap-2">
                          <span>{account.icon || "🏦"}</span>
                          <span>{account.name}</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Confirmacao Automatica */}
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div className="space-y-0.5">
                <Label htmlFor="incomeAutoConfirm" className="cursor-pointer">
                  Confirmacao automatica
                </Label>
                <p className="text-xs text-muted-foreground">
                  Confirmar automaticamente quando chegar o dia
                </p>
              </div>
              <Switch
                id="incomeAutoConfirm"
                checked={incomeSourceFormData.isAutoConfirm || false}
                onCheckedChange={(checked) =>
                  setIncomeSourceFormData(prev => ({ ...prev, isAutoConfirm: checked }))
                }
              />
            </div>
          </div>

          <DialogFooter className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setIsIncomeSourceFormOpen(false)}
              disabled={isSubmittingIncomeSource}
              className="w-1/4"
            >
              Cancelar
            </Button>
            <Button onClick={handleSubmitIncomeSource} disabled={isSubmittingIncomeSource} className="w-1/4">
              {isSubmittingIncomeSource && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingIncomeSource ? "Salvar" : "Adicionar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Income Source Confirmation */}
      <AlertDialog open={!!deletingIncomeSource} onOpenChange={(open) => !open && setDeletingIncomeSource(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir fonte de renda?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir &quot;{deletingIncomeSource?.name}&quot;?
              Esta ação não pode ser desfeita e também removerá todas as transações associadas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteIncomeSource}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Goal Form Modal */}
      {budgets.length > 0 && (
        <GoalFormModal
          open={isGoalFormOpen}
          onOpenChange={setIsGoalFormOpen}
          budgetId={budgets[0].id}
          onSuccess={fetchData}
        />
      )}
    </div>
  );
}
