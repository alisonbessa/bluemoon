"use client";

import { useState } from "react";
import { Button } from "@/shared/ui/button";
import {
  PageHeader,
  EmptyState,
  DeleteConfirmDialog,
  LoadingState,
  SummaryCard,
  ResponsiveButton,
} from "@/shared/molecules";
import {
  COMPACT_TABLE_STYLES,
  GroupToggleRow,
  HoverActions,
  useExpandedGroups,
} from "@/shared/ui/compact-table";
import { AccountForm, type Account, type AccountFormData } from "@/components/accounts";
import {
  Plus,
  Wallet,
  CreditCard,
  PiggyBank,
  Eye,
  EyeOff,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/shared/lib/utils";
import { formatCurrency, formatCurrencyCompact } from "@/shared/lib/formatters";
import { useTutorial } from "@/shared/tutorial/tutorial-provider";
import { useAccounts, useBudgets, useMembers } from "@/shared/hooks";

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
  // SWR hooks for cached data fetching
  const { accounts, isLoading: accountsLoading, mutate: mutateAccounts } = useAccounts();
  const { budgets, isLoading: budgetsLoading } = useBudgets();
  const { members, isLoading: membersLoading } = useMembers();

  const isLoading = accountsLoading || budgetsLoading || membersLoading;

  const { notifyActionCompleted, isActive: isTutorialActive } = useTutorial();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [preselectedType, setPreselectedType] = useState<string | undefined>(undefined);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [deletingAccount, setDeletingAccount] = useState<Account | null>(null);
  const [includeInvestments, setIncludeInvestments] = useState(false);
  const { isExpanded, toggleGroup } = useExpandedGroups([
    "checking",
    "savings",
    "credit_card",
    "cash",
    "benefit",
  ]);

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
      const text = await response.text();
      const error = text ? JSON.parse(text) : { message: `Erro ${response.status}` };
      throw new Error(error.message || error.error || "Erro ao criar conta");
    }

    toast.success("Conta criada com sucesso!");
    mutateAccounts();

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
    mutateAccounts();
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
      mutateAccounts();
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
    return <LoadingState fullHeight />;
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      {/* Header */}
      <PageHeader
        title="Contas"
        description="Gerencie suas contas bancárias, cartões e investimentos"
        actions={
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
            <ResponsiveButton
              onClick={() => setIsFormOpen(true)}
              size="sm"
              icon={<Plus />}
              data-tutorial="add-account-button"
            >
              Nova Conta
            </ResponsiveButton>
          </div>
        }
      />

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <SummaryCard
          icon={<Wallet className="h-4 w-4" />}
          label="Patrimônio Líquido"
          value={formatCurrency(totalBalance - totalDebt)}
          tooltip="Soma de todas as suas contas menos as dívidas (faturas de cartão de crédito)"
        />
        <SummaryCard
          icon={<PiggyBank className="h-4 w-4 text-green-500" />}
          label="Saldo em Contas"
          value={formatCurrency(totalBalance)}
          valueColor="positive"
          tooltip={`Soma de contas correntes, poupança${includeInvestments ? ", investimentos" : ""} e benefícios. Não inclui cartões de crédito.`}
        />
        <SummaryCard
          icon={<CreditCard className="h-4 w-4 text-red-500" />}
          label="Fatura dos Cartões"
          value={formatCurrency(totalDebt)}
          valueColor="negative"
          tooltip="Soma das faturas de todos os cartões de crédito"
        />
      </div>

      {/* Compact Accounts Table */}
      {accounts.length > 0 ? (
        <div className="rounded-lg border bg-card">
          {/* Table Header - Desktop only */}
          <div
            className={cn(COMPACT_TABLE_STYLES.header, "hidden md:grid")}
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
                      <div key={account.id}>
                        {/* Desktop Row */}
                        <div
                          className={cn(COMPACT_TABLE_STYLES.itemRow, "hidden md:grid")}
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

                        {/* Mobile Card */}
                        <div
                          className="md:hidden flex items-center justify-between p-3 border-t cursor-pointer hover:bg-muted/50"
                          onClick={() => setEditingAccount(account)}
                        >
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <div className="flex-shrink-0 text-lg">
                              {account.icon || config.icon}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium truncate">
                                  {account.name}
                                </span>
                                {isCreditCardAccount && account.closingDay && (
                                  <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded flex-shrink-0">
                                    Fecha dia {account.closingDay}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                                {account.owner ? (
                                  <span className="flex items-center gap-1">
                                    <span
                                      className="h-2 w-2 rounded-full"
                                      style={{
                                        backgroundColor: account.owner.color || "#6366f1",
                                      }}
                                    />
                                    {account.owner.name}
                                  </span>
                                ) : (
                                  <span>Compartilhado</span>
                                )}
                                {isCreditCardAccount && account.creditLimit && (
                                  <span>• Limite: {formatCurrencyCompact(account.creditLimit)}</span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div
                            className={cn(
                              "font-medium tabular-nums text-right flex-shrink-0 ml-2",
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
                      </div>
                    );
                  })}
              </div>
            );
          })}
        </div>
      ) : (
        <EmptyState
          icon={<Wallet className="h-6 w-6 text-muted-foreground" />}
          title="Nenhuma conta cadastrada"
          description="Adicione suas contas bancárias e cartões para começar"
          action={{
            label: "Adicionar Conta",
            onClick: () => setIsFormOpen(true),
            icon: <Plus className="mr-2 h-4 w-4" />,
          }}
        />
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

      <DeleteConfirmDialog
        open={!!deletingAccount}
        onOpenChange={(open) => !open && setDeletingAccount(null)}
        onConfirm={handleDeleteAccount}
        title="Excluir conta?"
        description={`Tem certeza que deseja excluir a conta "${deletingAccount?.name}"? Esta ação não pode ser desfeita.`}
      />
    </div>
  );
}
