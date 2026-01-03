"use client";

import { useEffect, useCallback } from "react";
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
import {
  COMPACT_TABLE_STYLES,
  GroupToggleRow,
  HoverActions,
  useExpandedGroups,
} from "@/components/ui/compact-table";
import { AccountForm, type Account, type AccountFormData } from "@/components/accounts";
import {
  Plus,
  Loader2,
  Wallet,
  CreditCard,
  PiggyBank,
  Eye,
  EyeOff,
  HelpCircle,
} from "lucide-react";
import { toast } from "sonner";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { useTutorial } from "@/components/tutorial/tutorial-provider";

interface Member {
  id: string;
  name: string;
  color?: string | null;
  type: string;
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

const TYPE_CONFIG = {
  checking: { label: "Contas Correntes", icon: "🏦" },
  savings: { label: "Poupança", icon: "🐷" },
  credit_card: { label: "Cartões de Crédito", icon: "💳" },
  cash: { label: "Dinheiro", icon: "💵" },
  investment: { label: "Investimentos", icon: "📈" },
  benefit: { label: "Benefícios", icon: "🍽️" },
};

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<AccountWithOwner[]>([]);
  const [budgets, setBudgets] = useState<{ id: string; name: string }[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const { notifyActionCompleted, isActive: isTutorialActive } = useTutorial();
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [preselectedType, setPreselectedType] = useState<string | undefined>(undefined);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [deletingAccount, setDeletingAccount] = useState<Account | null>(null);
  const [includeInvestments, setIncludeInvestments] = useState(true);
  const { isExpanded, toggleGroup } = useExpandedGroups([
    "checking",
    "savings",
    "credit_card",
    "cash",
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
      toast.error("Nenhum orçamento encontrado");
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

    // Notify tutorial that user created an account
    if (isTutorialActive) {
      notifyActionCompleted("hasAccounts");
    }
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

      toast.success("Conta excluída com sucesso!");
      setDeletingAccount(null);
      fetchData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao excluir conta");
    }
  };

  // Group accounts by type
  const accountsByType = {
    checking: accounts.filter((a) => a.type === "checking"),
    savings: accounts.filter((a) => a.type === "savings"),
    credit_card: accounts.filter((a) => a.type === "credit_card"),
    cash: accounts.filter((a) => a.type === "cash"),
    investment: accounts.filter((a) => a.type === "investment"),
    benefit: accounts.filter((a) => a.type === "benefit"),
  };

  const totalBalance = accounts
    .filter((a) => {
      if (a.type === "credit_card") return false;
      if (a.type === "investment" && !includeInvestments) return false;
      return true;
    })
    .reduce((sum, a) => sum + a.balance, 0);

  const totalDebt = accounts
    .filter((a) => a.type === "credit_card")
    .reduce((sum, a) => sum + a.balance, 0);

  const typesWithAccounts = Object.entries(accountsByType).filter(
    ([_, accts]) => accts.length > 0
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
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Contas</h1>
          <p className="text-sm text-muted-foreground">
            Gerencie suas contas bancárias, cartões e investimentos
          </p>
        </div>
        <div className="flex items-center gap-4">
          {accountsByType.investment.length > 0 && (
            <button
              onClick={() => setIncludeInvestments(!includeInvestments)}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              title={
                includeInvestments
                  ? "Ocultar investimentos do patrimônio"
                  : "Incluir investimentos no patrimônio"
              }
            >
              {includeInvestments ? (
                <Eye className="h-4 w-4" />
              ) : (
                <EyeOff className="h-4 w-4" />
              )}
              <span className="hidden sm:inline">Investimentos</span>
            </button>
          )}
          <Button onClick={() => setIsFormOpen(true)} size="sm" data-tutorial="add-account-button">
            <Plus className="mr-2 h-4 w-4" />
            Nova Conta
          </Button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-lg border bg-card p-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Wallet className="h-4 w-4" />
            <span>Patrimônio Líquido</span>
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="h-3.5 w-3.5 cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                Soma de todas as suas contas menos as dívidas (faturas de cartão de crédito)
              </TooltipContent>
            </Tooltip>
          </div>
          <div className="mt-1 text-xl font-bold">
            {formatCurrency(totalBalance - totalDebt)}
          </div>
        </div>

        <div className="rounded-lg border bg-card p-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <PiggyBank className="h-4 w-4 text-green-500" />
            <span>Saldo em Contas</span>
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="h-3.5 w-3.5 cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                Soma de contas correntes, poupança{includeInvestments ? ", investimentos" : ""} e benefícios. Não inclui cartões de crédito.
              </TooltipContent>
            </Tooltip>
          </div>
          <div className="mt-1 text-xl font-bold text-green-600">
            {formatCurrency(totalBalance)}
          </div>
        </div>

        <div className="rounded-lg border bg-card p-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CreditCard className="h-4 w-4 text-red-500" />
            <span>Fatura dos Cartões</span>
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="h-3.5 w-3.5 cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                Soma das faturas de todos os cartões de crédito
              </TooltipContent>
            </Tooltip>
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
                  gridCols={GRID_COLS}
                  emptyColsCount={2}
                  onAdd={() => {
                    setPreselectedType(type);
                    setIsFormOpen(true);
                  }}
                  addTitle={`Adicionar ${config.label.toLowerCase().replace(/s$/, "")}`}
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
            Adicione suas contas bancárias e cartões para começar
          </p>
          <Button className="mt-4" onClick={() => setIsFormOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Adicionar Conta
          </Button>
        </div>
      )}

      {/* Forms and Dialogs */}
      <AccountForm
        open={isFormOpen}
        onOpenChange={(open) => {
          setIsFormOpen(open);
          if (!open) setPreselectedType(undefined);
        }}
        onSubmit={handleCreateAccount}
        mode="create"
        members={members}
        initialData={preselectedType ? { type: preselectedType as "checking" | "savings" | "credit_card" | "cash" | "investment" | "benefit" } : undefined}
      />

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
            icon: editingAccount.icon || undefined,
            color: editingAccount.color || undefined,
          }}
          mode="edit"
          members={members}
        />
      )}

      <AlertDialog
        open={!!deletingAccount}
        onOpenChange={(open) => !open && setDeletingAccount(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir conta?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a conta &quot;{deletingAccount?.name}&quot;?
              Esta ação não pode ser desfeita.
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
