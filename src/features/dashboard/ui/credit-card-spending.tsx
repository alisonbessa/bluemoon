"use client";

import { useState } from "react";
import useSWR, { mutate } from "swr";
import {
  Card,
  CardContent,
  CardDescription,
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
import { CreditCardIcon, Loader2, Banknote } from "lucide-react";
import { Skeleton } from "@/shared/ui/skeleton";
import { formatCurrency } from "@/shared/lib/formatters";
import { Button } from "@/shared/ui/button";
import { Label } from "@/shared/ui/label";
import { toast } from "sonner";
import { getAccountTypeIcon } from "@/features/accounts/types";

interface CreditCard {
  id: string;
  name: string;
  icon: string | null;
  creditLimit: number;
  spent: number;
  available: number;
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
}

export function CreditCardSpending({
  creditCards,
  isLoading,
  budgetId,
  onPaymentComplete,
}: CreditCardSpendingProps) {
  const [selectedCardId, setSelectedCardId] = useState<string>("all");
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

  const totalSpent = creditCards.reduce((sum, cc) => sum + cc.spent, 0);
  const totalLimit = creditCards.reduce((sum, cc) => sum + cc.creditLimit, 0);
  const totalAvailable = totalLimit - totalSpent;

  const selectedCard = selectedCardId === "all"
    ? { id: "all", name: "Todos os Cartões", spent: totalSpent, creditLimit: totalLimit, available: totalAvailable, icon: null }
    : creditCards.find((cc) => cc.id === selectedCardId);

  if (!selectedCard) return null;

  const usagePercent = selectedCard.creditLimit > 0
    ? Math.min((selectedCard.spent / selectedCard.creditLimit) * 100, 100)
    : 0;

  const isOverLimit = selectedCard.spent > selectedCard.creditLimit;
  const canPay = selectedCardId !== "all" && selectedCard.spent > 0 && budgetId;

  return (
    <>
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <CreditCardIcon className="h-4 w-4" />
                Fatura do Cartão
              </CardTitle>
              <CardDescription>Gastos no mês atual</CardDescription>
            </div>
            {creditCards.length > 1 && (
              <Select value={selectedCardId} onValueChange={setSelectedCardId}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Selecione um cartão" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Cartões</SelectItem>
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
          {/* Progress bar */}
          <div className="space-y-2">
            <Progress
              value={usagePercent}
              className={`h-2 ${isOverLimit ? "[&>div]:bg-red-600" : ""}`}
            />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Limite: {formatCurrency(selectedCard.creditLimit)}</span>
              <span className={selectedCard.available < 0 ? "text-red-600" : "text-green-600"}>
                {selectedCard.available >= 0 ? "Disponível: " : "Excedido: "}
                {formatCurrency(Math.abs(selectedCard.available))}
              </span>
            </div>
          </div>

          {/* Closed bill (ready to pay) */}
          {selectedCard.closedBill != null && selectedCard.closedBill > 0 && selectedCardId !== "all" && (
            <div className="rounded-lg border p-3 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Fatura fechada</span>
                <span className="font-bold text-red-600">{formatCurrency(selectedCard.closedBill)}</span>
              </div>
              {(selectedCard as CreditCard).dueDay && (
                <p className="text-xs text-muted-foreground">
                  Vencimento dia {(selectedCard as CreditCard).dueDay}
                </p>
              )}
              <Button
                variant="default"
                size="sm"
                className="w-full gap-2"
                onClick={() => {
                  const card = creditCards.find((cc) => cc.id === selectedCardId);
                  if (card) {
                    setPayingCard(card);
                    setSettleAmount(card.closedBill ?? card.spent);
                    if (card.paymentAccountId) {
                      setFromAccountId(card.paymentAccountId);
                    } else if (paymentAccounts.length === 1) {
                      setFromAccountId(paymentAccounts[0].id);
                    }
                  }
                }}
              >
                <Banknote className="h-4 w-4" />
                Pagar fatura
              </Button>
            </div>
          )}

          {/* Open cycle */}
          {selectedCard.openBill != null && selectedCard.openBill > 0 && selectedCardId !== "all" && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Ciclo atual</span>
              <span className="font-medium">{formatCurrency(selectedCard.openBill)}</span>
            </div>
          )}

          {/* Total for "all" view or fallback */}
          {(selectedCardId === "all" || selectedCard.closedBill == null) && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Gasto total</span>
              <span className={`font-bold ${isOverLimit ? "text-red-600" : ""}`}>
                {formatCurrency(selectedCard.spent)}
              </span>
            </div>
          )}

          {/* Pay bill button fallback (all view or no closed/open) */}
          {canPay && (selectedCardId === "all" || selectedCard.closedBill == null || selectedCard.closedBill === 0) && (
            <Button
              variant="outline"
              size="sm"
              className="w-full gap-2"
              onClick={() => {
                const card = creditCards.find((cc) => cc.id === selectedCardId);
                if (card) {
                  setPayingCard(card);
                  setSettleAmount(card.spent);
                  if (card.paymentAccountId) {
                    setFromAccountId(card.paymentAccountId);
                  } else if (paymentAccounts.length === 1) {
                    setFromAccountId(paymentAccounts[0].id);
                  }
                }
              }}
            >
              <Banknote className="h-4 w-4" />
              Pagar fatura
            </Button>
          )}

          {/* Individual cards summary when "all" is selected */}
          {selectedCardId === "all" && creditCards.length > 1 && (
            <div className="space-y-2 pt-2 border-t">
              {creditCards.map((cc) => {
                const cardPercent = cc.creditLimit > 0
                  ? Math.min((cc.spent / cc.creditLimit) * 100, 100)
                  : 0;
                return (
                  <div key={cc.id} className="flex items-center gap-2 text-sm">
                    <span className="w-5">{cc.icon || "💳"}</span>
                    <span className="flex-1 truncate">{cc.name}</span>
                    <span className="font-medium tabular-nums">
                      {formatCurrency(cc.spent)}
                    </span>
                    <div className="w-16">
                      <Progress value={cardPercent} className="h-1.5" />
                    </div>
                  </div>
                );
              })}
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
              Criar uma transferência de{" "}
              <strong className="text-foreground">{formatCurrency(settleAmount)}</strong>{" "}
              para quitar a fatura do cartão.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label>Pagar com qual conta?</Label>
              <Select value={fromAccountId} onValueChange={setFromAccountId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a conta" />
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
              disabled={isPaying || !fromAccountId}
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
