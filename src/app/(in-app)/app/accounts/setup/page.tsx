"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
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
import { AccountForm, type Account, type AccountFormData } from "@/components/accounts";
import {
  Plus,
  ArrowRight,
  Loader2,
  Sparkles,
  Wallet,
  CreditCard,
  PiggyBank,
} from "lucide-react";
import {
  COMPACT_TABLE_STYLES,
  GroupToggleRow,
  HoverActions,
  useExpandedGroups,
} from "@/components/ui/compact-table";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

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

interface AccountWithOwner extends Account {
  owner?: Member | null;
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

const GRID_COLS = "24px 1fr 100px 100px 120px";

// Type configuration with display order (investment always last)
const TYPE_CONFIG: Record<string, { label: string; icon: string; order: number }> = {
  checking: { label: "Contas Correntes", icon: "🏦", order: 1 },
  savings: { label: "Poupança", icon: "🐷", order: 2 },
  credit_card: { label: "Cartões de Crédito", icon: "💳", order: 3 },
  cash: { label: "Dinheiro", icon: "💵", order: 4 },
  benefit: { label: "Benefícios", icon: "🍽️", order: 5 },
  investment: { label: "Investimentos", icon: "📈", order: 6 }, // Always last
};

// Ordered type keys for consistent display
const ORDERED_TYPES = Object.entries(TYPE_CONFIG)
  .sort((a, b) => a[1].order - b[1].order)
  .map(([key]) => key) as Array<keyof typeof TYPE_CONFIG>;

export default function AccountsSetupPage() {
  const router = useRouter();
  const [accounts, setAccounts] = useState<AccountWithOwner[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [defaultAccountType, setDefaultAccountType] = useState<string | undefined>(undefined);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [deletingAccount, setDeletingAccount] = useState<Account | null>(null);
  const { isExpanded, toggleGroup } = useExpandedGroups([
    "checking",
    "savings",
    "credit_card",
    "cash",
    "investment",
    "benefit",
  ]);

  const fetchData = useCallback(async () => {
    try {
      const [accountsRes, budgetsRes, membersRes] = await Promise.all([
        fetch("/api/app/accounts"),
        fetch("/api/app/budgets"),
        fetch("/api/app/members"),
      ]);

      if (accountsRes.ok) {
        const data = await accountsRes.json();
        setAccounts(data.accounts || []);
      }

      if (budgetsRes.ok) {
        const data = await budgetsRes.json();
        setBudgets(data.budgets || []);
      }

      if (membersRes.ok) {
        const data = await membersRes.json();
        setMembers(data.members || []);
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

  const handleCreateAccount = async (data: AccountFormData) => {
    if (budgets.length === 0) {
      toast.error("Nenhum orcamento encontrado");
      return;
    }

    const response = await fetch("/api/app/accounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...data, budgetId: budgets[0].id }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Erro ao criar conta");
    }

    toast.success("Conta criada com sucesso!");
    fetchData();
  };

  const handleEditAccount = async (data: AccountFormData) => {
    if (!editingAccount) return;

    const response = await fetch(`/api/app/accounts/${editingAccount.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Erro ao atualizar conta");
    }

    toast.success("Conta atualizada com sucesso!");
    setEditingAccount(null);
    fetchData();
  };

  const handleDeleteAccount = async () => {
    if (!deletingAccount) return;

    try {
      const response = await fetch(`/api/app/accounts/${deletingAccount.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Erro ao excluir conta");
      }

      toast.success("Conta excluida com sucesso!");
      setDeletingAccount(null);
      fetchData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao excluir conta");
    }
  };

  const handleContinue = () => {
    router.push("/app/income/setup");
  };

  const handleSkip = () => {
    router.push("/app/income/setup");
  };

  // Group accounts by type (using ordered types for consistent display)
  const accountsByType: Record<string, AccountWithOwner[]> = {};
  for (const type of ORDERED_TYPES) {
    accountsByType[type] = accounts.filter((a) => a.type === type);
  }

  const totalBalance = accounts
    .filter((a) => a.type !== "credit_card")
    .reduce((sum, a) => sum + a.balance, 0);

  const totalDebt = accounts
    .filter((a) => a.type === "credit_card")
    .reduce((sum, a) => sum + a.balance, 0);

  // Get types with accounts, maintaining the order from ORDERED_TYPES
  const typesWithAccounts = ORDERED_TYPES
    .filter((type) => accountsByType[type].length > 0)
    .map((type) => [type, accountsByType[type]] as [string, AccountWithOwner[]]);

  // Function to open form with pre-selected type
  const openFormWithType = (type: string) => {
    setDefaultAccountType(type);
    setIsFormOpen(true);
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
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <h1 className="text-2xl font-bold">Configure suas Contas</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Adicione e personalize suas contas bancarias, cartoes e investimentos
          </p>
        </div>
        <Button onClick={() => setIsFormOpen(true)} size="sm">
          <Plus className="mr-2 h-4 w-4" />
          Nova Conta
        </Button>
      </div>

      {/* Welcome Message */}
      <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
        <p className="text-sm text-foreground">
          Configure suas contas financeiras. Você pode editar os nomes, criar novas contas ou remover as que não precisa.
        </p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-lg border bg-card p-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Wallet className="h-4 w-4" />
            <span>Patrimônio Líquido</span>
          </div>
          <div className="mt-1 text-xl font-bold">
            {formatCurrency(totalBalance - totalDebt)}
          </div>
        </div>

        <div className="rounded-lg border bg-card p-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <PiggyBank className="h-4 w-4 text-green-500" />
            <span>Saldo em Contas</span>
          </div>
          <div className="mt-1 text-xl font-bold text-green-600">
            {formatCurrency(totalBalance)}
          </div>
        </div>

        <div className="rounded-lg border bg-card p-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CreditCard className="h-4 w-4 text-red-500" />
            <span>Fatura dos Cartões</span>
          </div>
          <div className="mt-1 text-xl font-bold text-red-600">
            {formatCurrency(totalDebt)}
          </div>
        </div>
      </div>

      {/* Compact Accounts Table */}
      {accounts.length > 0 ? (
        <div className="rounded-lg border bg-card">
          {/* Table Header */}
          <div
            className={COMPACT_TABLE_STYLES.header}
            style={{ gridTemplateColumns: GRID_COLS }}
          >
            <div></div>
            <div>Conta</div>
            <div>Proprietário</div>
            <div className="text-right">Limite</div>
            <div className="text-right">Saldo</div>
          </div>

          {/* Grouped by Type */}
          {typesWithAccounts.map(([type, typeAccounts]) => {
            const config = TYPE_CONFIG[type as keyof typeof TYPE_CONFIG];
            const expanded = isExpanded(type);
            const isCreditCard = type === "credit_card";
            const typeTotal = typeAccounts.reduce((sum, a) => sum + a.balance, 0);

            return (
              <div key={type}>
                <GroupToggleRow
                  isExpanded={expanded}
                  onToggle={() => toggleGroup(type)}
                  icon={config.icon}
                  label={config.label}
                  count={typeAccounts.length}
                  gridCols={GRID_COLS}
                  emptyColsCount={2}
                  onAdd={() => openFormWithType(type)}
                  addTitle={`Adicionar ${config.label.toLowerCase()}`}
                  summary={
                    <>
                      {isCreditCard && typeTotal > 0 && "-"}
                      {formatCurrencyCompact(Math.abs(typeTotal))}
                    </>
                  }
                  summaryClassName={cn(
                    isCreditCard
                      ? typeTotal > 0
                        ? "text-red-600"
                        : "text-foreground"
                      : "text-green-600"
                  )}
                />

                {/* Account Rows */}
                {expanded &&
                  typeAccounts.map((account) => {
                    const isCreditCardAccount = account.type === "credit_card";

                    return (
                      <div
                        key={account.id}
                        className={COMPACT_TABLE_STYLES.itemRow}
                        style={{ gridTemplateColumns: GRID_COLS }}
                      >
                        <div className="flex items-center justify-center">
                          <span className="text-base">
                            {account.icon || config.icon}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="truncate font-medium">{account.name}</span>
                          {isCreditCardAccount && account.closingDay && (
                            <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                              Fecha dia {account.closingDay}
                            </span>
                          )}
                          {account.type === "benefit" && account.depositDay && (
                            <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                              Recebe dia {account.depositDay}
                            </span>
                          )}
                          <HoverActions
                            onEdit={() => setEditingAccount(account)}
                            onDelete={() => setDeletingAccount(account)}
                            editTitle="Editar conta"
                            deleteTitle="Excluir conta"
                          />
                        </div>
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          {account.owner ? (
                            <>
                              <span
                                className="h-2 w-2 rounded-full flex-shrink-0"
                                style={{
                                  backgroundColor: account.owner.color || "#6366f1",
                                }}
                              />
                              <span className="truncate text-xs">
                                {account.owner.name}
                              </span>
                            </>
                          ) : (
                            <span className="text-xs">Compartilhado</span>
                          )}
                        </div>
                        <div className="text-right text-muted-foreground">
                          {isCreditCardAccount && account.creditLimit ? (
                            <span className="text-xs">
                              {formatCurrencyCompact(account.creditLimit)}
                            </span>
                          ) : account.type === "benefit" && account.monthlyDeposit ? (
                            <span className="text-xs">
                              {formatCurrencyCompact(account.monthlyDeposit)}/mês
                            </span>
                          ) : (
                            <span className="text-xs">-</span>
                          )}
                        </div>
                        <div
                          className={cn(
                            "text-right font-medium tabular-nums",
                            isCreditCardAccount
                              ? account.balance > 0
                                ? "text-red-600"
                                : "text-foreground"
                              : account.balance >= 0
                              ? "text-green-600"
                              : "text-red-600"
                          )}
                        >
                          {isCreditCardAccount && account.balance > 0 && "-"}
                          {formatCurrencyCompact(Math.abs(account.balance))}
                        </div>
                      </div>
                    );
                  })}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed bg-card p-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <Wallet className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="font-semibold">Nenhuma conta cadastrada</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Adicione suas contas bancarias e cartoes para comecar a organizar suas financas
          </p>
          <Button className="mt-4" onClick={() => setIsFormOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Adicionar Primeira Conta
          </Button>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between border-t pt-4">
        <Button variant="ghost" onClick={handleSkip}>
          Pular
        </Button>

        <Button onClick={handleContinue}>
          Continuar
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>

      {/* Create Account Form */}
      <AccountForm
        open={isFormOpen}
        onOpenChange={(open) => {
          setIsFormOpen(open);
          if (!open) setDefaultAccountType(undefined);
        }}
        onSubmit={handleCreateAccount}
        initialData={defaultAccountType ? { type: defaultAccountType as "checking" | "savings" | "credit_card" | "cash" | "investment" | "benefit" } : undefined}
        mode="create"
        members={members}
      />

      {/* Edit Account Form */}
      {editingAccount && (
        <AccountForm
          open={!!editingAccount}
          onOpenChange={(open) => !open && setEditingAccount(null)}
          onSubmit={handleEditAccount}
          initialData={{
            name: editingAccount.name,
            type: editingAccount.type,
            balance: editingAccount.balance,
            ownerId: editingAccount.ownerId || undefined,
            creditLimit: editingAccount.creditLimit || undefined,
            closingDay: editingAccount.closingDay || undefined,
            dueDay: editingAccount.dueDay || undefined,
            monthlyDeposit: editingAccount.monthlyDeposit || undefined,
            depositDay: editingAccount.depositDay || undefined,
            icon: editingAccount.icon || undefined,
            color: editingAccount.color || undefined,
          }}
          mode="edit"
          members={members}
        />
      )}

      {/* Delete Confirmation */}
      <AlertDialog
        open={!!deletingAccount}
        onOpenChange={(open) => !open && setDeletingAccount(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir conta?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a conta &quot;{deletingAccount?.name}&quot;?
              Esta acao nao pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAccount}
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
