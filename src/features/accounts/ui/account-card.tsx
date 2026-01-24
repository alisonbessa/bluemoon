"use client";

import { Card, CardContent } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import { Pencil, Trash2, CreditCard, Landmark, Wallet, PiggyBank, TrendingUp, UtensilsCrossed } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { formatCurrency } from "@/shared/lib/formatters";
import type { AccountType, Account } from "../types";

interface AccountCardProps {
  account: Account;
  onEdit?: (account: Account) => void;
  onDelete?: (account: Account) => void;
}

const TYPE_CONFIG: Record<
  AccountType,
  { label: string; icon: React.ReactNode; defaultIcon: string }
> = {
  checking: {
    label: "Conta Corrente",
    icon: <Landmark className="h-5 w-5" />,
    defaultIcon: "🏦",
  },
  savings: {
    label: "Poupança",
    icon: <PiggyBank className="h-5 w-5" />,
    defaultIcon: "🐷",
  },
  credit_card: {
    label: "Cartão de Crédito",
    icon: <CreditCard className="h-5 w-5" />,
    defaultIcon: "💳",
  },
  cash: {
    label: "Dinheiro",
    icon: <Wallet className="h-5 w-5" />,
    defaultIcon: "💵",
  },
  investment: {
    label: "Investimento",
    icon: <TrendingUp className="h-5 w-5" />,
    defaultIcon: "📈",
  },
  benefit: {
    label: "Benefício",
    icon: <UtensilsCrossed className="h-5 w-5" />,
    defaultIcon: "🍽️",
  },
};

export function AccountCard({ account, onEdit, onDelete }: AccountCardProps) {
  const config = TYPE_CONFIG[account.type];
  const isCreditCard = account.type === "credit_card";

  const availableCredit = isCreditCard && account.creditLimit
    ? account.creditLimit - account.balance
    : null;

  return (
    <Card className="group relative overflow-hidden transition-all hover:shadow-md">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div
              className="flex h-12 w-12 items-center justify-center rounded-xl text-2xl"
              style={{ backgroundColor: account.color || "#6366f1" + "20" }}
            >
              {account.icon || config.defaultIcon}
            </div>
            <div>
              <h3 className="font-semibold">{account.name}</h3>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="secondary">
                  {config.label}
                </Badge>
                {account.owner && (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: account.owner.color || "#6366f1" }}
                    />
                    {account.owner.name}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
            {onEdit && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => onEdit(account)}
              >
                <Pencil className="h-4 w-4" />
              </Button>
            )}
            {onDelete && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive hover:text-destructive"
                onClick={() => onDelete(account)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        <div className="mt-4 space-y-2">
          <div className="flex items-baseline justify-between">
            <span className="text-sm text-muted-foreground">
              {isCreditCard ? "Fatura Atual" : "Saldo"}
            </span>
            <span
              className={cn(
                "text-lg font-bold",
                isCreditCard
                  ? account.balance > 0
                    ? "text-destructive"
                    : "text-foreground"
                  : account.balance >= 0
                  ? "text-green-600 dark:text-green-400"
                  : "text-destructive"
              )}
            >
              {isCreditCard && account.balance > 0 && "-"}
              {formatCurrency(Math.abs(account.balance))}
            </span>
          </div>

          {isCreditCard && account.creditLimit && (
            <>
              <div className="flex items-baseline justify-between text-sm">
                <span className="text-muted-foreground">Limite</span>
                <span>{formatCurrency(account.creditLimit)}</span>
              </div>
              <div className="flex items-baseline justify-between text-sm">
                <span className="text-muted-foreground">Disponível</span>
                <span className="text-green-600 dark:text-green-400">
                  {formatCurrency(availableCredit || 0)}
                </span>
              </div>
              {/* Credit usage bar */}
              <div className="mt-2">
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn(
                      "h-full transition-all",
                      account.balance / account.creditLimit > 0.8
                        ? "bg-destructive"
                        : account.balance / account.creditLimit > 0.5
                        ? "bg-yellow-500"
                        : "bg-green-500"
                    )}
                    style={{
                      width: `${Math.min(
                        (account.balance / account.creditLimit) * 100,
                        100
                      )}%`,
                    }}
                  />
                </div>
              </div>
            </>
          )}

          {isCreditCard && (account.closingDay || account.dueDay) && (
            <div className="mt-3 flex gap-4 border-t pt-3 text-sm">
              {account.closingDay && (
                <div>
                  <span className="text-muted-foreground">Fecha dia </span>
                  <span className="font-medium">{account.closingDay}</span>
                </div>
              )}
              {account.dueDay && (
                <div>
                  <span className="text-muted-foreground">Vence dia </span>
                  <span className="font-medium">{account.dueDay}</span>
                </div>
              )}
            </div>
          )}

        </div>
      </CardContent>
    </Card>
  );
}
