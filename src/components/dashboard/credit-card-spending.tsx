"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { CreditCardIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface CreditCard {
  id: string;
  name: string;
  icon: string | null;
  creditLimit: number;
  spent: number;
  available: number;
}

interface CreditCardSpendingProps {
  creditCards: CreditCard[];
  isLoading?: boolean;
}

function formatCurrency(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export function CreditCardSpending({
  creditCards,
  isLoading,
}: CreditCardSpendingProps) {
  const [selectedCardId, setSelectedCardId] = useState<string>("all");

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

  if (creditCards.length === 0) {
    return null;
  }

  // Calculate totals for "all" option
  const totalSpent = creditCards.reduce((sum, cc) => sum + cc.spent, 0);
  const totalLimit = creditCards.reduce((sum, cc) => sum + cc.creditLimit, 0);
  const totalAvailable = totalLimit - totalSpent;

  const selectedCard = selectedCardId === "all"
    ? { name: "Todos os Cartoes", spent: totalSpent, creditLimit: totalLimit, available: totalAvailable }
    : creditCards.find((cc) => cc.id === selectedCardId);

  if (!selectedCard) return null;

  const usagePercent = selectedCard.creditLimit > 0
    ? Math.min((selectedCard.spent / selectedCard.creditLimit) * 100, 100)
    : 0;

  const isOverLimit = selectedCard.spent > selectedCard.creditLimit;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <CreditCardIcon className="h-4 w-4" />
              Fatura do Cartao
            </CardTitle>
            <CardDescription>Gastos no mes atual</CardDescription>
          </div>
          {creditCards.length > 1 && (
            <Select value={selectedCardId} onValueChange={setSelectedCardId}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Selecione um cartao" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Cartoes</SelectItem>
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
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Gasto</span>
            <span className={`font-bold ${isOverLimit ? "text-red-600" : ""}`}>
              {formatCurrency(selectedCard.spent)}
            </span>
          </div>
          <Progress
            value={usagePercent}
            className={`h-2 ${isOverLimit ? "[&>div]:bg-red-600" : ""}`}
          />
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Limite: {formatCurrency(selectedCard.creditLimit)}</span>
            <span className={selectedCard.available < 0 ? "text-red-600" : "text-green-600"}>
              {selectedCard.available >= 0 ? "Disponivel: " : "Excedido: "}
              {formatCurrency(Math.abs(selectedCard.available))}
            </span>
          </div>
        </div>

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
  );
}
