"use client";

import { useState } from "react";
import {
  PageHeader,
  PageContent,
  EmptyState,
  DeleteConfirmDialog,
  LoadingState,
  ResponsiveButton,
} from "@/shared/molecules";
import { SummaryCardGrid } from "@/shared/organisms";
import {
  COMPACT_TABLE_STYLES,
  GroupToggleRow,
  HoverActions,
  useExpandedGroups,
} from "@/shared/ui/compact-table";
import { AccountForm } from "@/features/accounts/ui";
import type { Account, AccountFormData } from "@/features/accounts/types";
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
import { useBudgets, useMembers, useUser } from "@/shared/hooks";
import { useCurrentUser } from "@/shared/hooks/use-current-user";
import { useViewMode } from "@/shared/providers/view-mode-provider";
import { useAccounts, type AccountsResponse } from "@/features/accounts/hooks/use-accounts";

const GRID_COLS = "24px 1fr 100px 100px 120px";

const TYPE_CONFIG = {
  checking: { label: "Contas Correntes", icon: "🏦" },
  savings: { label: "Poupança", icon: "🐷" },
  credit_card: { label: "Cartões de Crédito", icon: "💳" },
  cash: { label: "Dinheiro", icon: "💵" },
  investment: { label: "Investimentos", icon: "📈" },
  benefit: { label: "Benefícios", icon: "🍽️" },
};

export interface AccountsClientProps {
  initialData: AccountsResponse | null;
}

export function AccountsClient({ initialData }: AccountsClientProps) {
  // SWR hooks for cached data fetching
  const { accounts, isLoading: accountsLoading, deleteAccount, updateAccount, createAccount } = useAccounts(
    initialData ? { fallbackData: initialData } : undefined,
  );
  const { budgets, isLoading: budgetsLoading } = useBudgets();
  const { members, isLoading: membersLoading } = useMembers();
  const { user, isLoading: userLoading } = useUser();
  const { currentPlan } = useCurrentUser();
  const { viewMode, setViewMode } = useViewMode();

  const isLoading = accountsLoading || budgetsLoading || membersLoading || userLoading;

  // Check if user has a Duo plan (can have shared ownership even before partner joins)
  const isDuoPlan = (currentPlan?.quotas?.maxBudgetMembers ?? 1) >= 2;

  const { notifyActionCompleted, isActive: isTutorialActive } = useTutorial();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [preselectedType, setPreselectedType] = useState<string | undefined>(undefined);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [deletingAccount, setDeletingAccount] = useState<Account | null>(null);
  const [includeInvestments, setIncludeInvestments] = useState(false);
  // Derive ownership filter from viewMode - no separate state needed
  // "all" shows everything (no client filter), "mine"/"shared" match directly
  const ownershipFilter = viewMode === "all" ? "all" : viewMode === "shared" ? "shared" : "mine";
  const setOwnershipFilter = (filter: 'mine' | 'shared') => {
    setViewMode(filter === 'mine' ? 'mine' : 'shared');
  };
  const { isExpanded, toggleGroup } = useExpandedGroups([], { accordion: true });

  // Get current user's member id by matching member.userId with current user's id
  const currentUserMemberId = members.find(m => m.userId === user?.id)?.id;

  const handleCreateAccount = async (data: AccountFormData) => {
    let budgetId = budgets[0]?.id;

    if (!budgetId) {
      try {
        const freshBudgets = await fetch("/api/app/budgets").then(r => r.json());
        budgetId = freshBudgets.budgets?.[0]?.id;
      } catch (e) {
        console.error("Error fetching budgets:", e);
      }
    }

    if (!budgetId) {
      toast.error("Nenhum orçamento encontrado. Por favor, recarregue a página.");
      return;
    }

    // createAccount does optimistic update + invalidates all /api/app/accounts* caches
    await createAccount({ ...data, budgetId } as Parameters<typeof createAccount>[0]);

    // Switch view mode to show the created account
    if (isDuoPlan) {
      const isSharedAccount = !data.ownerId;
      const targetView = isSharedAccount ? "shared" : "mine";
      if (viewMode !== targetView && viewMode !== "all") {
        setViewMode(targetView);
      }
    }

    if (isTutorialActive) {
      notifyActionCompleted("hasAccounts");
    }
  };

  const handleEditAccount = async (data: AccountFormData) => {
    if (!editingAccount) return;
    setEditingAccount(null);
    await updateAccount(editingAccount.id, data);
  };

  const handleDeleteAccount = async () => {
    if (!deletingAccount) return;
    setDeletingAccount(null);
    await deleteAccount(deletingAccount.id);
  };

  // Filter accounts by ownership (client-side, complements server-side viewMode filter)
  const filterByOwnership = (account: Account) => {
    if (ownershipFilter === 'all') return true;
    if (ownershipFilter === 'mine') return account.ownerId === currentUserMemberId;
    if (ownershipFilter === 'shared') return !account.ownerId;
    return true;
  };

  const filteredAccounts = isDuoPlan ? accounts.filter(filterByOwnership) : accounts;

  // Group accounts by type
  const accountsByType = {
    checking: filteredAccounts.filter((a) => a.type === "checking"),
    savings: filteredAccounts.filter((a) => a.type === "savings"),
    credit_card: filteredAccounts.filter((a) => a.type === "credit_card"),
    cash: filteredAccounts.filter((a) => a.type === "cash"),
    investment: filteredAccounts.filter((a) => a.type === "investment"),
    benefit: filteredAccounts.filter((a) => a.type === "benefit"),
  };

  const totalBalance = filteredAccounts
    .filter((a) => {
      if (a.type === "credit_card") return false;
      if (a.type === "investment" && !includeInvestments) return false;
      return true;
    })
    .reduce((sum, a) => sum + a.balance, 0);

  const totalDebt = filteredAccounts
    .filter((a) => a.type === "credit_card")
    .reduce((sum, a) => sum + a.balance, 0);

  // Check if we have investments (unfiltered) to show toggle
  const hasInvestments = accounts.some((a) => a.type === "investment");

  // Check if we have mixed ownership to show filter (for Duo plans or multi-member budgets)
  // Hide in "visible" privacy mode (viewMode=all) because all accounts are shared
  const hasMixedOwnership = isDuoPlan && viewMode !== "all" &&
    accounts.some(a => a.ownerId === currentUserMemberId) &&
    accounts.some(a => !a.ownerId || a.ownerId !== currentUserMemberId);

  const typesWithAccounts = Object.entries(accountsByType).filter(
    ([_, accts]) => accts.length > 0
  );

  if (isLoading) {
    return <LoadingState fullHeight />;
  }

  return (
    <PageContent>
      {/* Header */}
      <PageHeader
        title="Contas"
        description="Gerencie suas contas bancárias, cartões e investimentos"
        actions={
          <ResponsiveButton
            onClick={() => setIsFormOpen(true)}
            size="sm"
            icon={<Plus />}
            data-tutorial="add-account-button"
          >
            Nova Conta
          </ResponsiveButton>
        }
      />

      {/* Filters Bar */}
      {(hasInvestments || hasMixedOwnership) && (
        <div className="flex items-center justify-between px-1 py-2 text-xs gap-2">
          {/* Left: Investment toggle */}
          {hasInvestments ? (
            <button
              onClick={() => setIncludeInvestments(!includeInvestments)}
              className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              title={
                includeInvestments
                  ? "Ocultar investimentos do patrimônio"
                  : "Incluir investimentos no patrimônio"
              }
            >
              {includeInvestments ? (
                <Eye className="h-3.5 w-3.5" />
              ) : (
                <EyeOff className="h-3.5 w-3.5" />
              )}
              <span>Investimentos</span>
            </button>
          ) : (
            <div />
          )}

          {/* Right: Ownership filter */}
          {hasMixedOwnership && (
            <div className="flex items-center gap-0.5 bg-muted rounded-md p-0.5">
              <button
                onClick={() => setOwnershipFilter('mine')}
                className={cn(
                  'px-2 py-0.5 rounded text-xs font-medium transition-colors',
                  ownershipFilter === 'mine'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                Minhas
              </button>
              <button
                onClick={() => setOwnershipFilter('shared')}
                className={cn(
                  'px-2 py-0.5 rounded text-xs font-medium transition-colors',
                  ownershipFilter === 'shared'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                Compartilhadas
              </button>
            </div>
          )}
        </div>
      )}

      {/* Summary */}
      <SummaryCardGrid
        items={[
          {
            id: "net-worth",
            icon: <Wallet className="h-full w-full" />,
            label: "Patrimônio Líquido",
            value: formatCurrency(totalBalance - totalDebt),
          },
          {
            id: "accounts-balance",
            icon: <PiggyBank className="h-full w-full text-green-500" />,
            label: "Saldo em Contas",
            value: formatCurrency(totalBalance),
            valueColor: "positive",
          },
          {
            id: "credit-cards",
            icon: <CreditCard className="h-full w-full text-red-500" />,
            label: "Fatura dos Cartões",
            value: formatCurrency(totalDebt),
            valueColor: "negative",
          },
        ]}
        className="grid-cols-1 sm:grid-cols-3"
      />

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
            icon: <Plus className="h-4 w-4" />,
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
        allowSharedOwnership={isDuoPlan}
        currentUserMemberId={currentUserMemberId}
        initialData={{
          ...(preselectedType ? { type: preselectedType as "checking" | "savings" | "credit_card" | "cash" | "investment" | "benefit" } : {}),
          ...(isDuoPlan && viewMode === "mine" && currentUserMemberId ? { ownerId: currentUserMemberId } : {}),
        }}
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
          allowSharedOwnership={isDuoPlan}
          currentUserMemberId={currentUserMemberId}
        />
      )}

      <DeleteConfirmDialog
        open={!!deletingAccount}
        onOpenChange={(open) => !open && setDeletingAccount(null)}
        onConfirm={handleDeleteAccount}
        title="Excluir conta?"
        description={`Tem certeza que deseja excluir a conta "${deletingAccount?.name}"? Esta ação não pode ser desfeita.`}
      />
    </PageContent>
  );
}
