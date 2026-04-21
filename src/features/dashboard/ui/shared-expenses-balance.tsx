"use client";

import { useState } from "react";
import useSWR from "swr";
import { mutate } from "swr";
import { getAccountTypeIcon } from "@/features/accounts/types";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/ui/card";
import { Skeleton } from "@/shared/ui/skeleton";
import { Button } from "@/shared/ui/button";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/shared/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import { Label } from "@/shared/ui/label";
import { CurrencyInput } from "@/shared/ui/currency-input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/shared/ui/dialog";
import { ScaleIcon, ArrowRightIcon, HandshakeIcon, CheckCircleIcon, ListIcon } from "lucide-react";
import { formatCurrency } from "@/shared/lib/formatters";
import { useViewMode } from "@/shared/providers/view-mode-provider";
import { toast } from "sonner";

interface MemberBalance {
  id: string;
  name: string;
  color: string;
  type: string;
  paidFromPersonalAccount: number;
  isCurrentUser: boolean;
}

interface Settlement {
  from: string;
  fromName: string;
  to: string;
  toName: string;
  amount: number;
}

interface SettledTransfer {
  fromName: string;
  toName: string;
  amount: number;
  date: string;
}

interface SharedBalanceResponse {
  members: MemberBalance[];
  totalFromPersonalAccounts: number;
  totalFromSharedAccounts: number;
  settlement: Settlement | null;
  settledTransfers?: SettledTransfer[];
  privacyMode?: string;
}

interface Account {
  id: string;
  name: string;
  type: string;
  ownerId: string | null;
  icon: string | null;
}

interface AccountsResponse {
  accounts: Account[];
}

interface SharedExpensesBalanceProps {
  budgetId: string;
  year: number;
  month: number;
}

export function SharedExpensesBalance({
  budgetId,
  year,
  month,
}: SharedExpensesBalanceProps) {
  const { isDuoPlan, isUnifiedPrivacy } = useViewMode();
  const [showSettleDialog, setShowSettleDialog] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [fromAccountId, setFromAccountId] = useState("");
  const [toAccountId, setToAccountId] = useState("");
  const [settleAmount, setSettleAmount] = useState(0);
  const [isSettling, setIsSettling] = useState(false);

  const shouldFetch = isDuoPlan && !isUnifiedPrivacy;

  const { data, isLoading } = useSWR<SharedBalanceResponse>(
    shouldFetch
      ? `/api/app/dashboard/shared-balance?budgetId=${budgetId}&year=${year}&month=${month}`
      : null
  );

  // Fetch ALL accounts for the settlement dialog (both members' accounts)
  const { data: accountsData } = useSWR<AccountsResponse>(
    shouldFetch && data?.settlement
      ? `/api/app/accounts?budgetId=${budgetId}&viewMode=all`
      : null
  );

  // Don't render for solo plans, unified privacy, or when no data
  if (!shouldFetch) return null;

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-56" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-24" />
        </CardContent>
      </Card>
    );
  }

  if (!data || data.members.length < 2 || data.totalFromPersonalAccounts === 0) {
    return null;
  }

  const settlement = data.settlement;
  const settledTransfers = data.settledTransfers ?? [];
  const hasSettled = settledTransfers.length > 0;
  // Filter accounts for settlement: personal accounts of each member
  const fromMemberAccounts = accountsData?.accounts.filter(
    (a) => a.ownerId === settlement?.from && a.type !== "credit_card"
  ) ?? [];

  const toMemberAccounts = accountsData?.accounts.filter(
    (a) => a.ownerId === settlement?.to && a.type !== "credit_card"
  ) ?? [];

  const handleOpenSettle = () => {
    setFromAccountId(fromMemberAccounts[0]?.id ?? "");
    setToAccountId(toMemberAccounts[0]?.id ?? "");
    setSettleAmount(settlement?.amount ?? 0);
    setShowSettleDialog(true);
  };

  const handleSettle = async () => {
    if (!settlement || !fromAccountId || !toAccountId) return;

    setIsSettling(true);
    try {
      const res = await fetch("/api/app/dashboard/shared-balance/settle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          budgetId,
          fromAccountId,
          toAccountId,
          amount: settleAmount,
          year,
          month,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Erro ao registrar acerto");
      }

      toast.success("Acerto registrado!", {
        description: `Transferência de ${formatCurrency(settleAmount)} de ${settlement.fromName} para ${settlement.toName}`,
      });

      // Revalidate shared balance, accounts, and dashboard summary
      await mutate(`/api/app/dashboard/shared-balance?budgetId=${budgetId}&year=${year}&month=${month}`);
      await mutate(`/api/app/accounts?budgetId=${budgetId}`);
      // Invalidate dashboard caches so summary cards reflect the new transfer
      await mutate((key: unknown) => typeof key === 'string' && key.startsWith('/api/app/dashboard?'));

      setShowSettleDialog(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao registrar acerto");
    } finally {
      setIsSettling(false);
    }
  };

  return (
    <>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <ScaleIcon className="h-4 w-4" />
            Acerto do Mês
          </CardTitle>
          <CardDescription>
            Despesas compartilhadas pagas com contas pessoais
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Per-member breakdown */}
          <div className="space-y-2">
            {data.members
              .filter((m) => m.paidFromPersonalAccount > 0)
              .sort((a, b) => b.paidFromPersonalAccount - a.paidFromPersonalAccount)
              .map((member) => (
                <div key={member.id} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: member.color }}
                    />
                    <span className="font-medium">
                      {member.name}
                      {member.isCurrentUser && (
                        <span className="text-muted-foreground font-normal"> (você)</span>
                      )}
                    </span>
                  </span>
                  <span className="font-semibold tabular-nums">
                    {formatCurrency(member.paidFromPersonalAccount)}
                  </span>
                </div>
              ))}
          </div>

          {/* Settlement suggestion - still has balance to settle */}
          {settlement && (
            <div className="rounded-lg bg-muted/50 p-3 border space-y-3">
              <div className="flex items-center justify-center gap-2 text-sm">
                <span className="font-medium">{settlement.fromName}</span>
                <ArrowRightIcon className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="font-medium">{settlement.toName}</span>
              </div>
              <p className="text-center text-lg font-bold">
                {formatCurrency(settlement.amount)}
              </p>
              <p className="text-center text-xs text-muted-foreground">
                para equilibrar os gastos compartilhados
              </p>

              {/* Partial settlement history */}
              {hasSettled && (
                <div className="space-y-1 pt-1 border-t border-border/50">
                  <p className="text-xs text-muted-foreground">Acertos ja realizados:</p>
                  {settledTransfers.map((t, i) => (
                    <div key={i} className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{t.fromName} → {t.toName}</span>
                      <span className="tabular-nums">{formatCurrency(t.amount)}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Action buttons */}
              <div className="flex gap-2">
                <Button
                  onClick={() => setShowDetailsModal(true)}
                  className="flex-1"
                  size="sm"
                  variant="outline"
                >
                  <ListIcon className="h-4 w-4 mr-2" />
                  Ver detalhes
                </Button>
                <Button
                  onClick={handleOpenSettle}
                  className="flex-1"
                  size="sm"
                  variant="default"
                >
                  <HandshakeIcon className="h-4 w-4 mr-2" />
                  Fazer Acerto
                </Button>
              </div>
            </div>
          )}

          {/* Settled state - all balanced */}
          {!settlement && hasSettled && (
            <div className="rounded-lg border border-green-800/30 bg-green-950/20 p-3 space-y-2">
              <div className="flex items-center gap-2 text-sm text-green-500">
                <CheckCircleIcon className="h-4 w-4" />
                <span className="font-medium">Acerto realizado</span>
              </div>
              <div className="space-y-1 pl-6">
                {settledTransfers.map((t, i) => (
                  <div key={i} className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{t.fromName} → {t.toName}</span>
                    <span className="tabular-nums">{formatCurrency(t.amount)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Context: total from shared accounts */}
          {data.totalFromSharedAccounts > 0 && (
            <p className="text-xs text-muted-foreground">
              Além disso, {formatCurrency(data.totalFromSharedAccounts)} foram pagos de contas compartilhadas.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Settlement confirmation dialog */}
      <AlertDialog open={showSettleDialog} onOpenChange={setShowSettleDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <HandshakeIcon className="h-5 w-5" />
              Fazer Acerto do Mês
            </AlertDialogTitle>
            <AlertDialogDescription>
              Transferência de <strong className="text-foreground">{settlement?.fromName}</strong> para{" "}
              <strong className="text-foreground">{settlement?.toName}</strong>.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="grid gap-4 py-2">
            {/* Settlement amount */}
            <div className="grid gap-2">
              <Label>Valor do acerto</Label>
              <CurrencyInput
                value={settleAmount}
                onChange={setSettleAmount}
              />
              {settlement && settleAmount !== settlement.amount && (
                <button
                  className="text-xs text-primary hover:underline text-left"
                  onClick={() => setSettleAmount(settlement.amount)}
                >
                  Usar valor total: {formatCurrency(settlement.amount)}
                </button>
              )}
            </div>

            {/* From account selector */}
            <div className="grid gap-2">
              <Label>Forma de pagamento de {settlement?.fromName} (origem)</Label>
              <Select value={fromAccountId} onValueChange={setFromAccountId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecione a forma de pagamento" />
                </SelectTrigger>
                <SelectContent>
                  {fromMemberAccounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {getAccountTypeIcon(account.type)} {account.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* To account selector */}
            <div className="grid gap-2">
              <Label>Forma de pagamento de {settlement?.toName} (destino)</Label>
              <Select value={toAccountId} onValueChange={setToAccountId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecione a forma de pagamento" />
                </SelectTrigger>
                <SelectContent>
                  {toMemberAccounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {getAccountTypeIcon(account.type)} {account.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSettling}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleSettle}
              disabled={isSettling || !fromAccountId || !toAccountId}
            >
              {isSettling ? (
                "Registrando..."
              ) : (
                <>
                  <CheckCircleIcon className="h-4 w-4 mr-2" />
                  Confirmar Acerto
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Details modal - shows shared transactions by payer */}
      <Dialog open={showDetailsModal} onOpenChange={setShowDetailsModal}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ListIcon className="h-5 w-5" />
              Detalhes do Acerto
            </DialogTitle>
            <DialogDescription>
              Despesas compartilhadas pagas com contas pessoais em {month}/{year}
            </DialogDescription>
          </DialogHeader>
          <SettlementDetails budgetId={budgetId} year={year} month={month} members={data?.members ?? []} />
        </DialogContent>
      </Dialog>
    </>
  );
}

function SettlementDetails({ budgetId, year, month, members }: {
  budgetId: string;
  year: number;
  month: number;
  members: MemberBalance[];
}) {
  const { data, isLoading } = useSWR<{ transactions: Array<{
    id: string;
    amount: number;
    description: string | null;
    date: string;
    paidByMemberId: string;
    categoryName: string | null;
    categoryIcon: string | null;
    accountName: string | null;
  }> }>(
    `/api/app/dashboard/shared-balance/details?budgetId=${budgetId}&year=${year}&month=${month}`
  );

  if (isLoading) {
    return <div className="space-y-2 py-4">
      <Skeleton className="h-8 w-full" />
      <Skeleton className="h-8 w-full" />
      <Skeleton className="h-8 w-full" />
    </div>;
  }

  const txs = data?.transactions ?? [];
  if (txs.length === 0) {
    return <p className="text-sm text-muted-foreground py-4 text-center">Nenhuma despesa compartilhada encontrada.</p>;
  }

  // Group by payer
  const grouped = new Map<string, typeof txs>();
  for (const tx of txs) {
    const list = grouped.get(tx.paidByMemberId) ?? [];
    list.push(tx);
    grouped.set(tx.paidByMemberId, list);
  }

  return (
    <div className="space-y-4">
      {Array.from(grouped.entries()).map(([memberId, memberTxs]) => {
        const member = members.find(m => m.id === memberId);
        const total = memberTxs.reduce((sum, t) => sum + Math.abs(t.amount), 0);
        return (
          <div key={memberId}>
            <div className="flex items-center justify-between mb-2">
              <span className="flex items-center gap-2 text-sm font-medium">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: member?.color }} />
                {member?.name ?? "Desconhecido"}
              </span>
              <span className="text-sm font-bold">{formatCurrency(total)}</span>
            </div>
            <div className="space-y-1 pl-4 border-l-2" style={{ borderColor: member?.color ?? "#ccc" }}>
              {memberTxs.map(tx => (
                <div key={tx.id} className="flex items-center justify-between text-xs py-1">
                  <span className="flex items-center gap-1.5 min-w-0 flex-1">
                    <span>{tx.categoryIcon || "📁"}</span>
                    <span className="truncate">{tx.description || tx.categoryName || "Despesa"}</span>
                    {tx.accountName && (
                      <span className="text-muted-foreground shrink-0">• {tx.accountName}</span>
                    )}
                  </span>
                  <span className="font-medium tabular-nums ml-2 shrink-0">
                    {formatCurrency(Math.abs(tx.amount))}
                  </span>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
