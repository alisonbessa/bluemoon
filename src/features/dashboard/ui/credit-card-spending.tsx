"use client";

import { useState } from "react";
import Link from "next/link";
import useSWR, { mutate } from "swr";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/ui/alert-dialog";
import { Progress } from "@/shared/ui/progress";
import { CreditCardIcon, Loader2, Banknote, FileTextIcon } from "lucide-react";
import { Skeleton } from "@/shared/ui/skeleton";
import { formatCurrency } from "@/shared/lib/formatters";
import { Button } from "@/shared/ui/button";
import { Label } from "@/shared/ui/label";
import { CurrencyInput } from "@/shared/ui/currency-input";
import { toast } from "sonner";
import { getAccountTypeIcon } from "@/features/accounts/types";

interface CreditCard {
  id: string;
  name: string;
  icon: string | null;
  creditLimit: number;
  spent: number;
  available: number;
  closingDay?: number | null;
  closedBill?: number;
  openBill?: number;
  dueDay?: number | null;
  paymentAccountId?: string | null;
  isAutoPayEnabled?: boolean;
}

interface Account {
  id: string;
  name: string;
  type: string;
  icon: string | null;
}

interface CreditCardSpendingProps {
  creditCards: CreditCard[];
  isLoading?: boolean;
  budgetId?: string;
  onPaymentComplete?: () => void;
  /** Selected year on the dashboard */
  year?: number;
  /** Selected month on the dashboard (1-12) */
  month?: number;
}

export function CreditCardSpending({
  creditCards,
  isLoading,
  budgetId,
  onPaymentComplete,
  year,
  month,
}: CreditCardSpendingProps) {
  const [selectedCardId, setSelectedCardId] = useState<string>(
    creditCards.length === 1 ? creditCards[0]?.id ?? "all" : "all"
  );
  const [payingCard, setPayingCard] = useState<CreditCard | null>(null);
  const [fromAccountId, setFromAccountId] = useState<string>("");
  const [settleAmount, setSettleAmount] = useState<number>(0);
  const [isPaying, setIsPaying] = useState(false);

  // Fetch non-credit-card accounts for payment source
  const { data: accountsData } = useSWR<{ accounts: Account[] }>(
    payingCard && budgetId ? `/api/app/accounts?budgetId=${budgetId}` : null
  );
  const paymentAccounts = accountsData?.accounts?.filter(
    (a) => a.type !== "credit_card"
  ) ?? [];

  const handlePayBill = async () => {
    if (!payingCard || !fromAccountId || !budgetId) return;

    setIsPaying(true);
    try {
      const res = await fetch("/api/app/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          budgetId,
          type: "transfer",
          amount: settleAmount,
          accountId: fromAccountId,
          toAccountId: payingCard.id,
          description: `Pagamento fatura ${payingCard.name}`,
          date: new Date().toISOString(),
          status: "cleared",
        }),
      });

      if (!res.ok) throw new Error("Erro ao registrar pagamento");

      toast.success(`Fatura de ${payingCard.name} paga!`);
      setPayingCard(null);
      setFromAccountId("");

      // Invalidate caches
      mutate((key: unknown) => typeof key === "string" && (
        key.startsWith("/api/app/dashboard") ||
        key.startsWith("/api/app/accounts")
      ));
      onPaymentComplete?.();
    } catch {
      toast.error("Erro ao pagar fatura. Tente novamente.");
    } finally {
      setIsPaying(false);
    }
  };

  const openPayDialog = (card: CreditCard, amount: number) => {
    setPayingCard(card);
    setSettleAmount(amount);
    if (card.paymentAccountId) {
      setFromAccountId(card.paymentAccountId);
    } else if (paymentAccounts.length === 1) {
      setFromAccountId(paymentAccounts[0].id);
    } else {
      setFromAccountId("");
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-20" />
        </CardContent>
      </Card>
    );
  }

  if (creditCards.length === 0) return null;

  const totalClosedBill = creditCards.reduce((sum, cc) => sum + (cc.closedBill ?? 0), 0);
  const totalOpenBill = creditCards.reduce((sum, cc) => sum + (cc.openBill ?? 0), 0);
  const totalLimit = creditCards.reduce((sum, cc) => sum + cc.creditLimit, 0);

  const isAllView = selectedCardId === "all";
  const selectedCard = isAllView
    ? null
    : creditCards.find((cc) => cc.id === selectedCardId);

  // Month names for "Fecha dia X/mes"
  const monthNames = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
  const nextMonthLabel = month ? monthNames[month % 12] : "";

  // Values to display — limit usage based on closed bill only
  const displayClosedBill = isAllView ? totalClosedBill : (selectedCard?.closedBill ?? 0);
  const displayOpenBill = isAllView ? totalOpenBill : (selectedCard?.openBill ?? 0);
  const displayLimit = isAllView ? totalLimit : (selectedCard?.creditLimit ?? 0);
  const displayAvailable = displayLimit - displayClosedBill;

  const usagePercent = displayLimit > 0
    ? Math.min((displayClosedBill / displayLimit) * 100, 100)
    : 0;
  const isOverLimit = displayClosedBill > displayLimit;

  return (
    <>
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <CreditCardIcon className="h-4 w-4" />
              Cartoes de Credito
            </CardTitle>
            {creditCards.length > 1 && (
              <Select value={selectedCardId} onValueChange={setSelectedCardId}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {creditCards.map((cc) => (
                    <SelectItem key={cc.id} value={cc.id}>
                      <span className="flex items-center gap-2">
                        <span>{cc.icon || "💳"}</span>
                        <span>{cc.name}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Closed bill section */}
          {displayClosedBill > 0 && (
            <div className="rounded-lg border p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Fatura fechada</span>
                <span className="text-lg font-bold text-red-600">
                  {formatCurrency(displayClosedBill)}
                </span>
              </div>
              {!isAllView && selectedCard?.dueDay && (
                <p className="text-xs text-muted-foreground">
                  Vence dia {selectedCard.dueDay}
                </p>
              )}
              {!isAllView && selectedCard && budgetId && (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 gap-2"
                    asChild
                  >
                    <Link href={`/app/insights/credit-card/${selectedCard.id}?year=${year || new Date().getFullYear()}&month=${month || new Date().getMonth() + 1}`}>
                      <FileTextIcon className="h-4 w-4" />
                      Ver fatura
                    </Link>
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    className="flex-1 gap-2"
                    onClick={() => openPayDialog(selectedCard, selectedCard.closedBill ?? 0)}
                  >
                    <Banknote className="h-4 w-4" />
                    Pagar fatura
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* No closed bill */}
          {displayClosedBill === 0 && (
            <div className="rounded-lg border border-dashed p-3">
              <p className="text-sm text-center text-muted-foreground">
                Nenhuma fatura pendente
              </p>
            </div>
          )}

          {/* Open cycle */}
          {displayOpenBill > 0 && (
            <div className="flex items-center justify-between text-sm">
              <div>
                <span className="text-muted-foreground">Proxima fatura</span>
                {!isAllView && selectedCard?.closingDay && nextMonthLabel && (
                  <span className="text-xs text-muted-foreground ml-1">
                    (fecha dia {selectedCard.closingDay}/{nextMonthLabel})
                  </span>
                )}
              </div>
              <span className="font-semibold tabular-nums">{formatCurrency(displayOpenBill)}</span>
            </div>
          )}

          {/* Limit usage bar */}
          <div className="space-y-1.5 pt-1">
            <Progress
              value={usagePercent}
              className={`h-2 ${isOverLimit ? "[&>div]:bg-red-600" : ""}`}
            />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Limite: {formatCurrency(displayLimit)}</span>
              <span className={displayAvailable < 0 ? "text-red-600" : "text-green-600"}>
                {displayAvailable >= 0 ? "Disponivel: " : "Excedido: "}
                {formatCurrency(Math.abs(displayAvailable))}
              </span>
            </div>
          </div>

          {/* Per-card breakdown in "all" view */}
          {isAllView && creditCards.length > 1 && (
            <div className="space-y-2 pt-2 border-t">
              {creditCards.map((cc) => (
                <div
                  key={cc.id}
                  className="flex items-center gap-2 text-sm cursor-pointer hover:bg-muted/50 rounded p-1 -mx-1 transition-colors"
                  onClick={() => setSelectedCardId(cc.id)}
                >
                  <span className="w-5">{cc.icon || "💳"}</span>
                  <span className="flex-1 truncate">{cc.name}</span>
                  <span className="font-medium tabular-nums text-red-600">
                    {formatCurrency(cc.closedBill ?? 0)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pay bill dialog */}
      <AlertDialog open={!!payingCard} onOpenChange={(open) => !open && setPayingCard(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Banknote className="h-5 w-5" />
              Pagar fatura de {payingCard?.name}
            </AlertDialogTitle>
            <AlertDialogDescription>
              Informe o valor e a conta para pagamento da fatura.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label>Valor do pagamento</Label>
              <CurrencyInput
                value={settleAmount}
                onChange={setSettleAmount}
              />
              {payingCard && settleAmount !== (payingCard.closedBill ?? 0) && (payingCard.closedBill ?? 0) > 0 && (
                <button
                  className="text-xs text-primary hover:underline text-left"
                  onClick={() => setSettleAmount(payingCard.closedBill ?? 0)}
                >
                  Usar valor total: {formatCurrency(payingCard.closedBill ?? 0)}
                </button>
              )}
            </div>
            <div className="grid gap-2">
              <Label>Pagar com qual forma de pagamento?</Label>
              <Select value={fromAccountId} onValueChange={setFromAccountId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a forma de pagamento" />
                </SelectTrigger>
                <SelectContent>
                  {paymentAccounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {getAccountTypeIcon(account.type)} {account.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPaying}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handlePayBill}
              disabled={isPaying || !fromAccountId || settleAmount <= 0}
            >
              {isPaying ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Pagando...
                </>
              ) : (
                "Pagar fatura"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
