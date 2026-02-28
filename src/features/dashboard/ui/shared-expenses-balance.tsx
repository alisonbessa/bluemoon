"use client";

import useSWR from "swr";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/ui/card";
import { Skeleton } from "@/shared/ui/skeleton";
import { ScaleIcon, ArrowRightIcon } from "lucide-react";
import { formatCurrency } from "@/shared/lib/formatters";
import { useViewMode } from "@/shared/providers/view-mode-provider";

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

  const shouldFetch = isDuoPlan && !isUnifiedPrivacy;

  const { data, isLoading } = useSWR<SharedBalanceResponse>(
    shouldFetch
      ? `/api/app/dashboard/shared-balance?budgetId=${budgetId}&year=${year}&month=${month}`
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

  return (
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
        {data.settlement && (
          <div className="rounded-lg bg-muted/50 p-3 border">
            <div className="flex items-center justify-center gap-2 text-sm">
              <span className="font-medium">{data.settlement.fromName}</span>
              <ArrowRightIcon className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="font-medium">{data.settlement.toName}</span>
            </div>
            <p className="text-center text-lg font-bold mt-1">
              {formatCurrency(data.settlement.amount)}
            </p>
            <p className="text-center text-xs text-muted-foreground mt-1">
              para equilibrar os gastos compartilhados
            </p>
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
  );
}
