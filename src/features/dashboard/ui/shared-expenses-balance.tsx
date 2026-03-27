"use client";

import { useState } from "react";
import useSWR from "swr";
import { mutate } from "swr";
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
import { ScaleIcon, ArrowRightIcon, HandshakeIcon, CheckCircleIcon } from "lucide-react";
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

interface SharedBalanceResponse {
  members: MemberBalance[];
  totalFromPersonalAccounts: number;
  totalFromSharedAccounts: number;
  settlement: Settlement | null;
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
  const [fromAccountId, setFromAccountId] = useState("");
  const [toAccountId, setToAccountId] = useState("");
  const [isSettling, setIsSettling] = useState(false);

  const shouldFetch = isDuoPlan && !isUnifiedPrivacy;

  const { data, isLoading } = useSWR<SharedBalanceResponse>(
    shouldFetch
      ? `/api/app/dashboard/shared-balance?budgetId=${budgetId}&year=${year}&month=${month}`
      : null
  );

  // Fetch accounts for the settlement dialog
  const { data: accountsData } = useSWR<AccountsResponse>(
    shouldFetch && data?.settlement
      ? `/api/app/accounts?budgetId=${budgetId}`
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

  // Filter accounts for settlement: personal accounts of each member
  const fromMemberAccounts = accountsData?.accounts.filter(
    (a) => a.ownerId === settlement?.from && a.type !== "credit_card"
  ) ?? [];

  const toMemberAccounts = accountsData?.accounts.filter(
    (a) => a.ownerId === settlement?.to && a.type !== "credit_card"
  ) ?? [];

  const handleOpenSettle = () => {
    // Pre-select first available account for each member
    setFromAccountId(fromMemberAccounts[0]?.id ?? "");
    setToAccountId(toMemberAccounts[0]?.id ?? "");
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
          amount: settlement.amount,
          year,
          month,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Erro ao registrar acerto");
      }

      toast.success("Acerto registrado!", {
        description: `Transferência de ${formatCurrency(settlement.amount)} de ${settlement.fromName} para ${settlement.toName}`,
      });

      // Revalidate shared balance and accounts data
      await mutate(`/api/app/dashboard/shared-balance?budgetId=${budgetId}&year=${year}&month=${month}`);
      await mutate(`/api/app/accounts?budgetId=${budgetId}`);

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

          {/* Settlement suggestion */}
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

              {/* Settle button */}
              <Button
                onClick={handleOpenSettle}
                className="w-full"
                size="sm"
                variant="default"
              >
                <HandshakeIcon className="h-4 w-4 mr-2" />
                Fazer Acerto
              </Button>
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
              Isso criará uma transferência de{" "}
              <strong className="text-foreground">{formatCurrency(settlement?.amount ?? 0)}</strong>{" "}
              de <strong className="text-foreground">{settlement?.fromName}</strong> para{" "}
              <strong className="text-foreground">{settlement?.toName}</strong>.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="grid gap-4 py-2">
            {/* From account selector */}
            <div className="grid gap-2">
              <Label>Conta de {settlement?.fromName} (origem)</Label>
              <Select value={fromAccountId} onValueChange={setFromAccountId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecione a conta" />
                </SelectTrigger>
                <SelectContent>
                  {fromMemberAccounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.icon || "🏦"} {account.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* To account selector */}
            <div className="grid gap-2">
              <Label>Conta de {settlement?.toName} (destino)</Label>
              <Select value={toAccountId} onValueChange={setToAccountId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecione a conta" />
                </SelectTrigger>
                <SelectContent>
                  {toMemberAccounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.icon || "🏦"} {account.name}
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
    </>
  );
}
