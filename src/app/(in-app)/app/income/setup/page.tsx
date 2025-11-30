"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CurrencyInput, formatCentsToCurrency, formatCentsToDisplay } from "@/components/ui/currency-input";
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
  ArrowLeft,
  ArrowRight,
  Loader2,
  Sparkles,
  Plus,
  Wallet,
  Briefcase,
  Gift,
  Building2,
  TrendingUp,
  MoreHorizontal,
} from "lucide-react";
import {
  COMPACT_TABLE_STYLES,
  GroupToggleRow,
  HoverActions,
  useExpandedGroups,
} from "@/components/ui/compact-table";
import { toast } from "sonner";

interface Budget {
  id: string;
  name: string;
}

interface Member {
  id: string;
  name: string;
  type: string;
  color?: string | null;
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
  type: "salary" | "benefit" | "freelance" | "rental" | "investment" | "other";
  amount: number;
  frequency: "monthly" | "biweekly" | "weekly";
  dayOfMonth?: number | null;
  member?: { id: string; name: string; color?: string | null } | null;
  account?: { id: string; name: string; icon?: string | null } | null;
}

interface IncomeFormData {
  name: string;
  type: "salary" | "benefit" | "freelance" | "rental" | "investment" | "other";
  amount: number;
  frequency: "monthly" | "biweekly" | "weekly";
  dayOfMonth?: number;
  memberId?: string;
  accountId?: string;
}

const GRID_COLS = "24px 1fr 100px 80px 100px";

const incomeTypeConfig: Record<string, { label: string; icon: string }> = {
  salary: { label: "Salários", icon: "💼" },
  benefit: { label: "Benefícios", icon: "🎁" },
  freelance: { label: "Freelances", icon: "💻" },
  rental: { label: "Aluguéis", icon: "🏠" },
  investment: { label: "Investimentos", icon: "📈" },
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

export default function IncomeSetupPage() {
  const router = useRouter();
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [incomeSources, setIncomeSources] = useState<IncomeSource[]>([]);
  const [totalMonthlyIncome, setTotalMonthlyIncome] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingSource, setEditingSource] = useState<IncomeSource | null>(null);
  const [deletingSource, setDeletingSource] = useState<IncomeSource | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, boolean>>({});
  const { isExpanded, toggleGroup } = useExpandedGroups([
    "salary",
    "benefit",
    "freelance",
    "rental",
    "investment",
    "other",
  ]);
  const [formData, setFormData] = useState<IncomeFormData>({
    name: "",
    type: "salary",
    amount: 0,
    frequency: "monthly",
    dayOfMonth: undefined,
    memberId: undefined,
    accountId: undefined,
  });

  const fetchData = useCallback(async () => {
    try {
      const [budgetsRes, membersRes, accountsRes, incomeRes] = await Promise.all([
        fetch("/api/app/budgets"),
        fetch("/api/app/members"),
        fetch("/api/app/accounts"),
        fetch("/api/app/income-sources"),
      ]);

      if (budgetsRes.ok) {
        const data = await budgetsRes.json();
        setBudgets(data.budgets || []);
      }

      if (membersRes.ok) {
        const data = await membersRes.json();
        setMembers(data.members || []);
      }

      if (accountsRes.ok) {
        const data = await accountsRes.json();
        setAccounts(data.accounts || []);
      }

      if (incomeRes.ok) {
        const data = await incomeRes.json();
        setIncomeSources(data.incomeSources || []);
        setTotalMonthlyIncome(data.totalMonthlyIncome || 0);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Erro ao carregar dados");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Filter accounts based on selected income type
  const filteredAccounts = useMemo(() => {
    const allowedTypes = ALLOWED_ACCOUNT_TYPES_BY_INCOME[formData.type] || [];
    return accounts.filter((account) => allowedTypes.includes(account.type));
  }, [accounts, formData.type]);

  const openCreateForm = (type?: string) => {
    const incomeType = (type as IncomeFormData["type"]) || "salary";
    setFormData({
      name: "",
      type: incomeType,
      amount: 0,
      frequency: "monthly",
      dayOfMonth: undefined,
      memberId: members[0]?.id,
      accountId: undefined,
    });
    setEditingSource(null);
    setIsFormOpen(true);
  };

  const openEditForm = (source: IncomeSource) => {
    setFormData({
      name: source.name,
      type: source.type,
      amount: source.amount, // Already in cents
      frequency: source.frequency,
      dayOfMonth: source.dayOfMonth || undefined,
      memberId: source.member?.id,
      accountId: source.account?.id,
    });
    setEditingSource(source);
    setIsFormOpen(true);
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, boolean> = {};

    if (!formData.name.trim()) {
      newErrors.name = true;
    }

    if (formData.amount <= 0) {
      newErrors.amount = true;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    if (budgets.length === 0) {
      toast.error("Nenhum orçamento encontrado");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        ...formData,
        budgetId: budgets[0].id,
        amount: formData.amount, // Already in cents
      };

      if (editingSource) {
        const response = await fetch(`/api/app/income-sources/${editingSource.id}`, {
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

      setIsFormOpen(false);
      setEditingSource(null);
      setErrors({});
      fetchData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao salvar");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingSource) return;

    try {
      const response = await fetch(`/api/app/income-sources/${deletingSource.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Erro ao excluir fonte de renda");
      }

      toast.success("Fonte de renda removida!");
      setDeletingSource(null);
      fetchData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao excluir");
    }
  };

  const handleContinue = () => {
    router.push("/app/budget");
  };

  // Group income sources by type
  const incomeByType = {
    salary: incomeSources.filter((s) => s.type === "salary"),
    benefit: incomeSources.filter((s) => s.type === "benefit"),
    freelance: incomeSources.filter((s) => s.type === "freelance"),
    rental: incomeSources.filter((s) => s.type === "rental"),
    investment: incomeSources.filter((s) => s.type === "investment"),
    other: incomeSources.filter((s) => s.type === "other"),
  };

  const typesWithIncome = Object.entries(incomeByType).filter(
    ([_, sources]) => sources.length > 0
  );

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
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <h1 className="text-2xl font-bold">Configure suas Rendas</h1>
            </div>
            <p className="text-sm text-muted-foreground">
              Adicione suas fontes de renda para calcular o orçamento mensal
            </p>
          </div>
        </div>
        <Button onClick={() => openCreateForm()} size="sm" data-tutorial="add-income-button">
          <Plus className="mr-2 h-4 w-4" />
          Nova Renda
        </Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-4" data-tutorial="income-summary">
        <div className="rounded-lg border bg-card p-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Wallet className="h-4 w-4 text-green-500" />
            <span>Renda Mensal Total</span>
          </div>
          <div className="mt-1 text-xl font-bold text-green-600">
            {formatCentsToCurrency(totalMonthlyIncome)}
          </div>
        </div>

        <div className="rounded-lg border bg-card p-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="text-lg">💰</span>
            <span>Fontes de Renda</span>
          </div>
          <div className="mt-1 text-xl font-bold">{incomeSources.length}</div>
        </div>
      </div>

      {/* Compact Income Table */}
      {incomeSources.length > 0 ? (
        <div className="rounded-lg border bg-card">
          {/* Table Header */}
          <div
            className={COMPACT_TABLE_STYLES.header}
            style={{ gridTemplateColumns: GRID_COLS }}
          >
            <div></div>
            <div>Fonte</div>
            <div>Quem Recebe</div>
            <div>Dia</div>
            <div className="text-right">Valor</div>
          </div>

          {/* Grouped by Type */}
          {typesWithIncome.map(([type, sources]) => {
            const config = incomeTypeConfig[type];
            const expanded = isExpanded(type);
            const typeTotal = sources.reduce((sum, s) => sum + s.amount, 0);

            return (
              <div key={type}>
                <GroupToggleRow
                  isExpanded={expanded}
                  onToggle={() => toggleGroup(type)}
                  icon={config.icon}
                  label={config.label}
                  count={sources.length}
                  gridCols={GRID_COLS}
                  emptyColsCount={2}
                  summary={`+${formatCentsToDisplay(typeTotal)}`}
                  summaryClassName="text-green-600"
                />

                {/* Income Source Rows */}
                {expanded &&
                  sources.map((source) => (
                    <div
                      key={source.id}
                      className={COMPACT_TABLE_STYLES.itemRow}
                      style={{ gridTemplateColumns: GRID_COLS }}
                    >
                      <div className="flex items-center justify-center">
                        <span className="text-base">{config.icon}</span>
                      </div>
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="truncate font-medium">{source.name}</span>
                        <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                          {frequencyLabels[source.frequency]}
                        </span>
                        <HoverActions
                          onEdit={() => openEditForm(source)}
                          onDelete={() => setDeletingSource(source)}
                          editTitle="Editar fonte de renda"
                          deleteTitle="Excluir fonte de renda"
                        />
                      </div>
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        {source.member ? (
                          <>
                            <span
                              className="h-2 w-2 rounded-full flex-shrink-0"
                              style={{
                                backgroundColor: source.member.color || "#6366f1",
                              }}
                            />
                            <span className="truncate text-xs">
                              {source.member.name}
                            </span>
                          </>
                        ) : (
                          <span className="text-xs">-</span>
                        )}
                      </div>
                      <div className="text-muted-foreground">
                        {source.dayOfMonth ? (
                          <span className="text-xs">Dia {source.dayOfMonth}</span>
                        ) : (
                          <span className="text-xs">-</span>
                        )}
                      </div>
                      <div className="text-right font-medium tabular-nums text-green-600">
                        +{formatCentsToDisplay(source.amount)}
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
            <Wallet className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="font-semibold">Nenhuma renda configurada</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Adicione suas fontes de renda para começar a planejar seu orçamento
          </p>
          <Button className="mt-4" onClick={() => openCreateForm()}>
            <Plus className="mr-2 h-4 w-4" />
            Adicionar Renda
          </Button>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between border-t pt-4">
        <Button variant="outline" onClick={() => openCreateForm()}>
          <Plus className="mr-2 h-4 w-4" />
          Adicionar Renda
        </Button>

        <Button onClick={handleContinue} disabled={incomeSources.length === 0}>
          Continuar para Orçamento
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>

      {/* Create/Edit Dialog */}
      <Dialog
        open={isFormOpen}
        onOpenChange={(open) => {
          setIsFormOpen(open);
          if (!open) setErrors({});
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingSource ? "Editar Renda" : "Nova Fonte de Renda"}
            </DialogTitle>
            <DialogDescription>
              {editingSource
                ? "Atualize os dados da fonte de renda"
                : "Adicione uma nova fonte de renda ao orçamento"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label
                htmlFor="name"
                className={errors.name ? "text-destructive" : ""}
              >
                Nome
              </Label>
              <Input
                id="name"
                placeholder="Ex: Salário da Empresa X"
                value={formData.name}
                onChange={(e) => {
                  setFormData({ ...formData, name: e.target.value });
                  if (errors.name && e.target.value.trim()) {
                    setErrors((prev) => ({ ...prev, name: false }));
                  }
                }}
                className={errors.name ? "border-destructive" : ""}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="type">Tipo</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value: IncomeFormData["type"]) => {
                    // Clear accountId if the new type doesn't allow the current account
                    const allowedTypes = ALLOWED_ACCOUNT_TYPES_BY_INCOME[value] || [];
                    const currentAccount = accounts.find((a) => a.id === formData.accountId);
                    const shouldClearAccount = currentAccount && !allowedTypes.includes(currentAccount.type);
                    setFormData({
                      ...formData,
                      type: value,
                      accountId: shouldClearAccount ? undefined : formData.accountId,
                    });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(incomeTypeConfig).map(
                      ([key, { label, icon }]) => (
                        <SelectItem key={key} value={key}>
                          <div className="flex items-center gap-2">
                            <span>{icon}</span>
                            {label}
                          </div>
                        </SelectItem>
                      )
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="frequency">Frequência</Label>
                <Select
                  value={formData.frequency}
                  onValueChange={(value: IncomeFormData["frequency"]) =>
                    setFormData({ ...formData, frequency: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(frequencyLabels).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label
                  htmlFor="amount"
                  className={errors.amount ? "text-destructive" : ""}
                >
                  Valor
                </Label>
                <CurrencyInput
                  id="amount"
                  placeholder="0,00"
                  value={formData.amount}
                  onChange={(valueInCents) => {
                    setFormData({ ...formData, amount: valueInCents });
                    if (errors.amount && valueInCents > 0) {
                      setErrors((prev) => ({ ...prev, amount: false }));
                    }
                  }}
                  className={errors.amount ? "border-destructive" : ""}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="dayOfMonth">Dia do Pagamento</Label>
                <Input
                  id="dayOfMonth"
                  type="number"
                  min="1"
                  max="31"
                  placeholder="5"
                  value={formData.dayOfMonth || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      dayOfMonth: parseInt(e.target.value) || undefined,
                    })
                  }
                />
              </div>
            </div>

            {members.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="member">Quem Recebe</Label>
                <Select
                  value={formData.memberId || ""}
                  onValueChange={(value) =>
                    setFormData({ ...formData, memberId: value || undefined })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione (opcional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {members.map((member) => (
                      <SelectItem key={member.id} value={member.id}>
                        {member.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {filteredAccounts.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="account">Conta de Destino</Label>
                <Select
                  value={formData.accountId || ""}
                  onValueChange={(value) =>
                    setFormData({ ...formData, accountId: value || undefined })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione (opcional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredAccounts.map((account) => (
                      <SelectItem key={account.id} value={account.id}>
                        {account.icon || "🏦"} {account.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {formData.type === "benefit"
                    ? "Apenas contas de benefício"
                    : formData.type === "other"
                    ? "Todas as contas disponíveis"
                    : "Contas correntes e poupança"}
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsFormOpen(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingSource ? "Salvar" : "Adicionar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog
        open={!!deletingSource}
        onOpenChange={(open) => !open && setDeletingSource(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir fonte de renda?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir &quot;{deletingSource?.name}&quot;?
              Esta ação não pode ser desfeita.
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
