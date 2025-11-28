"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { AccountForm, AccountCard, type Account, type AccountFormData } from "@/components/accounts";
import { Plus, ArrowRight, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";

interface Budget {
  id: string;
  name: string;
}

export default function AccountsSetupPage() {
  const router = useRouter();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [deletingAccount, setDeletingAccount] = useState<Account | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [accountsRes, budgetsRes] = await Promise.all([
        fetch("/api/app/accounts"),
        fetch("/api/app/budgets"),
      ]);

      if (accountsRes.ok) {
        const accountsData = await accountsRes.json();
        setAccounts(accountsData.accounts || []);
      }

      if (budgetsRes.ok) {
        const budgetsData = await budgetsRes.json();
        setBudgets(budgetsData.budgets || []);
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
      body: JSON.stringify({
        ...data,
        budgetId: budgets[0].id,
      }),
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

      toast.success("Conta excluída com sucesso!");
      setDeletingAccount(null);
      fetchData();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Erro ao excluir conta"
      );
    }
  };

  const handleContinue = () => {
    router.push("/app");
  };

  // Group accounts by type
  const checkingAccounts = accounts.filter((a) => a.type === "checking");
  const savingsAccounts = accounts.filter((a) => a.type === "savings");
  const creditCards = accounts.filter((a) => a.type === "credit_card");
  const cashAccounts = accounts.filter((a) => a.type === "cash");
  const investmentAccounts = accounts.filter((a) => a.type === "investment");

  const totalBalance = accounts
    .filter((a) => a.type !== "credit_card")
    .reduce((sum, a) => sum + a.balance, 0);

  const totalDebt = accounts
    .filter((a) => a.type === "credit_card")
    .reduce((sum, a) => sum + a.balance, 0);

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Configure suas Contas</h1>
        </div>
        <p className="text-muted-foreground">
          Adicione suas contas bancárias e cartões de crédito para começar a
          controlar seu orçamento. Informe o saldo atual de cada conta.
        </p>
      </div>

      {/* Summary Card */}
      {accounts.length > 0 && (
        <Card>
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-sm text-muted-foreground">Patrimônio Líquido</p>
              <p className="text-2xl font-bold">
                {((totalBalance - totalDebt) / 100).toLocaleString("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                })}
              </p>
            </div>
            <div className="flex gap-8 text-sm">
              <div>
                <p className="text-muted-foreground">Saldo em Contas</p>
                <p className="font-semibold text-green-600 dark:text-green-400">
                  {(totalBalance / 100).toLocaleString("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  })}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Fatura dos Cartões</p>
                <p className="font-semibold text-destructive">
                  {(totalDebt / 100).toLocaleString("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Accounts List */}
      <div className="space-y-6">
        {/* Checking Accounts */}
        {checkingAccounts.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold">Contas Correntes</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {checkingAccounts.map((account) => (
                <AccountCard
                  key={account.id}
                  account={account}
                  onEdit={setEditingAccount}
                  onDelete={setDeletingAccount}
                />
              ))}
            </div>
          </div>
        )}

        {/* Savings Accounts */}
        {savingsAccounts.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold">Poupança</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {savingsAccounts.map((account) => (
                <AccountCard
                  key={account.id}
                  account={account}
                  onEdit={setEditingAccount}
                  onDelete={setDeletingAccount}
                />
              ))}
            </div>
          </div>
        )}

        {/* Credit Cards */}
        {creditCards.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold">Cartões de Crédito</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {creditCards.map((account) => (
                <AccountCard
                  key={account.id}
                  account={account}
                  onEdit={setEditingAccount}
                  onDelete={setDeletingAccount}
                />
              ))}
            </div>
          </div>
        )}

        {/* Cash */}
        {cashAccounts.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold">Dinheiro</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {cashAccounts.map((account) => (
                <AccountCard
                  key={account.id}
                  account={account}
                  onEdit={setEditingAccount}
                  onDelete={setDeletingAccount}
                />
              ))}
            </div>
          </div>
        )}

        {/* Investments */}
        {investmentAccounts.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold">Investimentos</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {investmentAccounts.map((account) => (
                <AccountCard
                  key={account.id}
                  account={account}
                  onEdit={setEditingAccount}
                  onDelete={setDeletingAccount}
                />
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {accounts.length === 0 && (
          <Card className="border-dashed">
            <CardHeader className="text-center">
              <CardTitle>Nenhuma conta cadastrada</CardTitle>
              <CardDescription>
                Adicione suas contas bancárias e cartões para começar a
                organizar suas finanças
              </CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center pb-6">
              <Button onClick={() => setIsFormOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Adicionar Primeira Conta
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between border-t pt-6">
        <Button variant="outline" onClick={() => setIsFormOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nova Conta
        </Button>

        <Button onClick={handleContinue} disabled={accounts.length === 0}>
          Continuar para o App
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>

      {/* Create Account Form */}
      <AccountForm
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        onSubmit={handleCreateAccount}
        mode="create"
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
            creditLimit: editingAccount.creditLimit || undefined,
            closingDay: editingAccount.closingDay || undefined,
            dueDay: editingAccount.dueDay || undefined,
            icon: editingAccount.icon || undefined,
            color: editingAccount.color || undefined,
          }}
          mode="edit"
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
              Tem certeza que deseja excluir a conta &quot;{deletingAccount?.name}
              &quot;? Esta ação não pode ser desfeita.
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
