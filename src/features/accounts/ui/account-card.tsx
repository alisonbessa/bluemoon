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

  // Current bill from billing cycle (if available), otherwise fall back to balance
  const currentBill = isCreditCard
    ? (account.currentBill != null ? account.currentBill : account.balance)
    : null;
  const showTotalDue = isCreditCard && account.currentBill != null && account.balance !== account.currentBill;

  return (
    <Card className="group relative overflow-hidden transition-all hover:shadow-md">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div
              className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent text-2xl"
              style={account.color ? { backgroundColor: account.color } : undefined}
              role="img"
              aria-label={config.label}
            >
              <span aria-hidden="true">{account.icon || config.defaultIcon}</span>
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
                      aria-hidden="true"
                      className="h-2 w-2 rounded-full bg-primary"
                      style={account.owner.color ? { backgroundColor: account.owner.color } : undefined}
                    />
                    {account.owner.name}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex gap-1 md:opacity-0 md:transition-opacity md:group-hover:opacity-100 md:group-focus-within:opacity-100">
            {onEdit && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => onEdit(account)}
                aria-label={`Editar forma de pagamento ${account.name}`}
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
                aria-label={`Excluir forma de pagamento ${account.name}`}
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
                  ? (currentBill || 0) > 0
                    ? "text-destructive"
                    : "text-foreground"
                  : account.balance >= 0
                  ? "text-success"
                  : "text-destructive"
              )}
            >
              {isCreditCard && (currentBill || 0) > 0 && "-"}
              {isCreditCard
                ? formatCurrency(Math.abs(currentBill || 0))
                : formatCurrency(Math.abs(account.balance))}
            </span>
          </div>

          {showTotalDue && (
            <div className="flex items-baseline justify-between text-sm">
              <span className="text-muted-foreground">Total Devido</span>
              <span className="text-destructive">
                -{formatCurrency(Math.abs(account.balance))}
              </span>
            </div>
          )}

          {isCreditCard && account.creditLimit && (
            <>
              <div className="flex items-baseline justify-between text-sm">
                <span className="text-muted-foreground">Limite</span>
                <span>{formatCurrency(account.creditLimit)}</span>
              </div>
              <div className="flex items-baseline justify-between text-sm">
                <span className="text-muted-foreground">Disponível</span>
                <span className="text-success">
                  {formatCurrency(availableCredit || 0)}
                </span>
              </div>
              {/* Credit usage bar */}
              <div
                className="mt-2"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(
                  Math.min((account.balance / account.creditLimit) * 100, 100)
                )}
                aria-label="Uso do limite de crédito"
              >
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn(
                      "h-full transition-all",
                      account.balance / account.creditLimit > 0.8
                        ? "bg-destructive"
                        : account.balance / account.creditLimit > 0.5
                        ? "bg-warning"
                        : "bg-success"
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
