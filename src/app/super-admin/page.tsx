"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { UnreadMessagesBell } from "@/shared/UnreadMessagesBell";
import useSWR from "swr";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useState } from "react";
import {
  Users,
  UserPlus,
  Activity,
  Receipt,
  Bot,
  CheckCircle,
  MessageSquare,
  TrendingUp,
  TrendingDown,
  Minus,
} from "lucide-react";

// --- Types ---

interface DailyStats {
  date: string;
  users: number;
  waitlist: number;
}

interface PlanStats {
  name: string;
  count: number;
}

interface KpiMetric {
  current: number;
  previous: number;
  delta: number;
}

interface OverviewData {
  period: { days: number };
  kpis: {
    totalUsers: number;
    newUsers: KpiMetric;
    activeUsers: KpiMetric;
    transactions: KpiMetric;
    telegramUsers: KpiMetric;
    onboardingCompleted: KpiMetric;
    pendingFeedback: number;
  };
  activity: {
    dau: number;
    wau: number;
    mau: number;
  };
  budgets: {
    total: number;
    duo: number;
    solo: number;
  };
  usersByRole: Record<string, number>;
}

interface EngagementData {
  dailyChart: { date: string; transactions: number; telegramMessages: number }[];
  transactionsBySource: Record<string, number>;
  transactionsByType: Record<string, number>;
  telegramResolutions: Record<string, number>;
  onboardingFunnel: {
    signups: number;
    completedOnboarding: number;
    createdTransactions: number;
    usedTelegram: number;
  };
}

interface CohortEntry {
  cohort: string;
  cohortSize: number;
  retention: Record<string, number>;
}

interface CohortData {
  cohorts: CohortEntry[];
  conversion: {
    totalUsers: number;
    onboarded: number;
    withPlan: number;
    betaUsers: number;
    lifetimeUsers: number;
    stripeSubscribers: number;
    accessLinksUsed: number;
    accessLinksAvailable: number;
    couponsUsed: number;
    couponsAvailable: number;
    deletedUsers: number;
    pendingDeletion: number;
  };
  inactiveUsers30d: number;
}

// --- Period options ---

const PERIOD_OPTIONS = [
  { label: "7 dias", value: 7 },
  { label: "30 dias", value: 30 },
  { label: "90 dias", value: 90 },
  { label: "180 dias", value: 180 },
  { label: "365 dias", value: 365 },
];

// --- Components ---

function DeltaBadge({ delta }: { delta: number }) {
  if (delta > 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
        <TrendingUp className="h-3 w-3" />
        +{delta}%
      </span>
    );
  }
  if (delta < 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-xs font-medium text-red-600 dark:text-red-400">
        <TrendingDown className="h-3 w-3" />
        {delta}%
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-0.5 text-xs font-medium text-muted-foreground">
      <Minus className="h-3 w-3" />
      0%
    </span>
  );
}

function KpiCard({
  title,
  value,
  subtitle,
  delta,
  icon: Icon,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  delta?: number;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Card>
      <CardContent className="pt-4 pb-3 px-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1 min-w-0">
            <p className="text-xs font-medium text-muted-foreground truncate">
              {title}
            </p>
            <div className="flex items-baseline gap-2">
              <p className="text-2xl font-bold tabular-nums">{value}</p>
              {delta !== undefined && <DeltaBadge delta={delta} />}
            </div>
            {subtitle && (
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            )}
          </div>
          <div className="rounded-md bg-muted p-2 shrink-0">
            <Icon className="h-4 w-4 text-muted-foreground" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function PeriodSelector({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex gap-1 bg-muted rounded-lg p-1">
      {PERIOD_OPTIONS.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
            value === opt.value
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function ActivityCards({ activity }: { activity: OverviewData["activity"] }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Usuarios Ativos</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 divide-x">
          {[
            { label: "Hoje (DAU)", value: activity.dau },
            { label: "Semana (WAU)", value: activity.wau },
            { label: "Mes (MAU)", value: activity.mau },
          ].map((item) => (
            <div key={item.label} className="text-center px-3">
              <p className="text-2xl font-bold tabular-nums">{item.value}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {item.label}
              </p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function BudgetCards({ budgets }: { budgets: OverviewData["budgets"] }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Orcamentos</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 divide-x">
          {[
            { label: "Total", value: budgets.total },
            { label: "Solo", value: budgets.solo },
            { label: "Duo", value: budgets.duo },
          ].map((item) => (
            <div key={item.label} className="text-center px-3">
              <p className="text-2xl font-bold tabular-nums">{item.value}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {item.label}
              </p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function RoleDistribution({
  roles,
  totalUsers,
}: {
  roles: Record<string, number>;
  totalUsers: number;
}) {
  const roleLabels: Record<string, string> = {
    user: "User",
    beta: "Beta",
    lifetime: "Lifetime",
    admin: "Admin",
  };
  const roleColors: Record<string, string> = {
    user: "bg-blue-500",
    beta: "bg-amber-500",
    lifetime: "bg-emerald-500",
    admin: "bg-purple-500",
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Distribuicao por Role</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {Object.entries(roles).map(([role, count]) => {
            const pct = totalUsers > 0 ? (count / totalUsers) * 100 : 0;
            return (
              <div key={role} className="flex items-center gap-2">
                <div
                  className={`w-2 h-2 rounded-full ${roleColors[role] || "bg-gray-500"}`}
                />
                <span className="text-sm flex-1">
                  {roleLabels[role] || role}
                </span>
                <span className="text-sm font-medium tabular-nums">
                  {count}
                </span>
                <span className="text-xs text-muted-foreground w-12 text-right tabular-nums">
                  {pct.toFixed(1)}%
                </span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function OnboardingFunnel({
  funnel,
}: {
  funnel: EngagementData["onboardingFunnel"];
}) {
  const steps = [
    { label: "Cadastro", value: funnel.signups, color: "#8884d8" },
    {
      label: "Onboarding",
      value: funnel.completedOnboarding,
      color: "#82ca9d",
    },
    {
      label: "1a Transacao",
      value: funnel.createdTransactions,
      color: "#ffc658",
    },
    { label: "Usou Telegram", value: funnel.usedTelegram, color: "#ff7c43" },
  ];

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Funil de Onboarding</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {steps.map((step, i) => {
            const pct =
              funnel.signups > 0
                ? Math.round((step.value / funnel.signups) * 100)
                : 0;
            return (
              <div key={step.label}>
                <div className="flex justify-between text-sm mb-1">
                  <span>{step.label}</span>
                  <span className="font-medium tabular-nums">
                    {step.value}{" "}
                    <span className="text-muted-foreground">({pct}%)</span>
                  </span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${pct}%`,
                      backgroundColor: step.color,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
        <p className="text-xs text-muted-foreground mt-3">
          Usuarios que se cadastraram no periodo selecionado
        </p>
      </CardContent>
    </Card>
  );
}

function TransactionBreakdown({
  bySource,
  byType,
}: {
  bySource: Record<string, number>;
  byType: Record<string, number>;
}) {
  const sourceLabels: Record<string, string> = {
    web: "Web",
    telegram: "Telegram",
  };
  const typeLabels: Record<string, string> = {
    expense: "Despesa",
    income: "Receita",
    transfer: "Transferencia",
  };
  const typeColors: Record<string, string> = {
    expense: "#ef4444",
    income: "#22c55e",
    transfer: "#3b82f6",
  };

  const sourceTotal = Object.values(bySource).reduce((a, b) => a + b, 0);
  const typeData = Object.entries(byType).map(([key, value]) => ({
    name: typeLabels[key] || key,
    value,
    color: typeColors[key] || "#6b7280",
  }));

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Transacoes por Tipo</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[180px] mb-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={typeData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" allowDecimals={false} />
              <YAxis type="category" dataKey="name" width={90} />
              <Tooltip />
              <Bar dataKey="value" name="Quantidade" radius={[0, 4, 4, 0]}>
                {typeData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="border-t pt-3">
          <p className="text-xs font-medium text-muted-foreground mb-2">
            Por Origem
          </p>
          <div className="flex gap-4">
            {Object.entries(bySource).map(([source, count]) => {
              const pct =
                sourceTotal > 0 ? Math.round((count / sourceTotal) * 100) : 0;
              return (
                <div key={source} className="text-sm">
                  <span className="text-muted-foreground">
                    {sourceLabels[source] || source}:
                  </span>{" "}
                  <span className="font-medium tabular-nums">
                    {count} ({pct}%)
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function TelegramResolutions({
  resolutions,
}: {
  resolutions: Record<string, number>;
}) {
  const labels: Record<string, { label: string; color: string }> = {
    confirmed: { label: "Confirmado", color: "bg-emerald-500" },
    corrected: { label: "Corrigido", color: "bg-amber-500" },
    cancelled: { label: "Cancelado", color: "bg-red-500" },
    fallback: { label: "Fallback", color: "bg-orange-500" },
    pending: { label: "Pendente", color: "bg-blue-500" },
    unknown_ignored: { label: "Desconhecido", color: "bg-gray-500" },
  };

  const total = Object.values(resolutions).reduce((a, b) => a + b, 0);
  const confirmed = resolutions.confirmed || 0;
  const accuracy = total > 0 ? Math.round((confirmed / total) * 100) : 0;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">
          Telegram IA
          <span className="ml-2 text-sm font-normal text-muted-foreground">
            ({total} mensagens, {accuracy}% acuracia)
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {Object.entries(resolutions)
            .sort((a, b) => b[1] - a[1])
            .map(([key, count]) => {
              const meta = labels[key] || {
                label: key,
                color: "bg-gray-500",
              };
              const pct = total > 0 ? Math.round((count / total) * 100) : 0;
              return (
                <div key={key} className="flex items-center gap-2">
                  <div
                    className={`w-2 h-2 rounded-full ${meta.color}`}
                  />
                  <span className="text-sm flex-1">{meta.label}</span>
                  <span className="text-sm font-medium tabular-nums">
                    {count}
                  </span>
                  <span className="text-xs text-muted-foreground w-10 text-right tabular-nums">
                    {pct}%
                  </span>
                </div>
              );
            })}
        </div>
      </CardContent>
    </Card>
  );
}

function CohortTable({ cohorts }: { cohorts: CohortEntry[] }) {
  if (cohorts.length === 0) return null;

  // Collect all unique months across all cohorts
  const allMonths = new Set<string>();
  for (const c of cohorts) {
    for (const m of Object.keys(c.retention)) {
      allMonths.add(m);
    }
  }
  const sortedMonths = Array.from(allMonths).sort();

  // For each cohort, compute retention % relative to cohort_month offset
  const getRetentionColor = (pct: number) => {
    if (pct >= 80) return "bg-emerald-500/30 text-emerald-700 dark:text-emerald-300";
    if (pct >= 60) return "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400";
    if (pct >= 40) return "bg-amber-500/20 text-amber-700 dark:text-amber-300";
    if (pct >= 20) return "bg-orange-500/20 text-orange-700 dark:text-orange-300";
    if (pct > 0) return "bg-red-500/15 text-red-700 dark:text-red-300";
    return "text-muted-foreground";
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">
          Retencao por Cohort (mensal)
        </CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="text-left py-2 pr-4 font-medium text-muted-foreground">
                Cohort
              </th>
              <th className="text-center py-2 px-2 font-medium text-muted-foreground">
                Usuarios
              </th>
              {sortedMonths.map((m) => (
                <th
                  key={m}
                  className="text-center py-2 px-2 font-medium text-muted-foreground"
                >
                  {m.slice(5)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {cohorts.map((c) => (
              <tr key={c.cohort} className="border-b last:border-0">
                <td className="py-2 pr-4 font-medium">{c.cohort}</td>
                <td className="text-center py-2 px-2 tabular-nums">
                  {c.cohortSize}
                </td>
                {sortedMonths.map((m) => {
                  const active = c.retention[m];
                  if (active === undefined || m < c.cohort) {
                    return (
                      <td key={m} className="text-center py-2 px-2">
                        <span className="text-muted-foreground/30">&mdash;</span>
                      </td>
                    );
                  }
                  const pct =
                    c.cohortSize > 0
                      ? Math.round((active / c.cohortSize) * 100)
                      : 0;
                  return (
                    <td key={m} className="text-center py-1.5 px-1">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-xs font-medium tabular-nums ${getRetentionColor(pct)}`}
                      >
                        {pct}%
                      </span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
        <p className="text-xs text-muted-foreground mt-3">
          % de usuarios do cohort que criaram pelo menos 1 transacao no mes
        </p>
      </CardContent>
    </Card>
  );
}

function ConversionMetrics({
  conversion,
  inactiveUsers30d,
}: {
  conversion: CohortData["conversion"];
  inactiveUsers30d: number;
}) {
  const pct = (n: number) =>
    conversion.totalUsers > 0
      ? Math.round((n / conversion.totalUsers) * 100)
      : 0;

  const metrics = [
    {
      label: "Fizeram Onboarding",
      value: conversion.onboarded,
      pctValue: pct(conversion.onboarded),
    },
    {
      label: "Tem Plano Atribuido",
      value: conversion.withPlan,
      pctValue: pct(conversion.withPlan),
    },
    {
      label: "Assinantes Stripe",
      value: conversion.stripeSubscribers,
      pctValue: pct(conversion.stripeSubscribers),
    },
    {
      label: "Usuarios Beta",
      value: conversion.betaUsers,
      pctValue: pct(conversion.betaUsers),
    },
    {
      label: "Usuarios Lifetime",
      value: conversion.lifetimeUsers,
      pctValue: pct(conversion.lifetimeUsers),
    },
  ];

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Conversao e Saude</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {metrics.map((m) => (
            <div key={m.label}>
              <div className="flex justify-between text-sm mb-1">
                <span>{m.label}</span>
                <span className="font-medium tabular-nums">
                  {m.value}{" "}
                  <span className="text-muted-foreground">({m.pctValue}%)</span>
                </span>
              </div>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${m.pctValue}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="border-t mt-4 pt-3 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Inativos (30+ dias)</span>
            <span className="font-medium text-amber-600 dark:text-amber-400 tabular-nums">
              {inactiveUsers30d}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Contas Excluidas</span>
            <span className="font-medium tabular-nums">
              {conversion.deletedUsers}
            </span>
          </div>
          {conversion.pendingDeletion > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                Exclusao Pendente
              </span>
              <span className="font-medium text-red-600 dark:text-red-400 tabular-nums">
                {conversion.pendingDeletion}
              </span>
            </div>
          )}
        </div>

        <div className="border-t mt-4 pt-3">
          <p className="text-xs font-medium text-muted-foreground mb-2">
            Links e Cupons
          </p>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <span className="text-muted-foreground">Links usados:</span>{" "}
              <span className="font-medium tabular-nums">
                {conversion.accessLinksUsed}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Links disponiveis:</span>{" "}
              <span className="font-medium tabular-nums">
                {conversion.accessLinksAvailable}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Cupons usados:</span>{" "}
              <span className="font-medium tabular-nums">
                {conversion.couponsUsed}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Cupons disponiveis:</span>{" "}
              <span className="font-medium tabular-nums">
                {conversion.couponsAvailable}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// --- Main ---

export default function SuperAdminDashboard() {
  const [days, setDays] = useState(30);

  const { data: overview, isLoading: overviewLoading } = useSWR<{
    data: OverviewData;
  }>(`/api/super-admin/stats/overview?days=${days}`);

  const { data: engagement } = useSWR<{ data: EngagementData }>(
    `/api/super-admin/stats/engagement?days=${days}`
  );

  const { data: cohortData } = useSWR<{ data: CohortData }>(
    "/api/super-admin/stats/cohort?months=6"
  );

  const { data: dailyStats } = useSWR<{ data: DailyStats[] }>(
    "/api/super-admin/stats/daily"
  );

  const { data: planStats } = useSWR<{ data: PlanStats[] }>(
    "/api/super-admin/stats/plans"
  );

  const totalUsers =
    planStats?.data.reduce((acc, curr) => acc + curr.count, 0) || 0;

  const kpis = overview?.data.kpis;
  const activity = overview?.data.activity;
  const budgets = overview?.data.budgets;
  const roles = overview?.data.usersByRole;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-center">
        <h1 className="text-2xl sm:text-3xl font-bold">
          Painel Administrativo
        </h1>
        <div className="flex items-center gap-3">
          <UnreadMessagesBell />
        </div>
      </div>

      {/* Period selector */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <PeriodSelector value={days} onChange={setDays} />
        <p className="text-xs text-muted-foreground">
          Comparando com os {days} dias anteriores
        </p>
      </div>

      {/* KPI Cards */}
      {overviewLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3">
          {Array.from({ length: 7 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="pt-4 pb-3 px-4">
                <div className="animate-pulse space-y-2">
                  <div className="h-3 bg-muted rounded w-20" />
                  <div className="h-7 bg-muted rounded w-12" />
                  <div className="h-3 bg-muted rounded w-16" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : kpis ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3">
          <KpiCard
            title="Total de Usuarios"
            value={kpis.totalUsers}
            icon={Users}
          />
          <KpiCard
            title="Novos Cadastros"
            value={kpis.newUsers.current}
            delta={kpis.newUsers.delta}
            subtitle={`${kpis.newUsers.previous} anterior`}
            icon={UserPlus}
          />
          <KpiCard
            title="Usuarios Ativos"
            value={kpis.activeUsers.current}
            delta={kpis.activeUsers.delta}
            subtitle={`${kpis.activeUsers.previous} anterior`}
            icon={Activity}
          />
          <KpiCard
            title="Transacoes Criadas"
            value={kpis.transactions.current}
            delta={kpis.transactions.delta}
            subtitle={`${kpis.transactions.previous} anterior`}
            icon={Receipt}
          />
          <KpiCard
            title="Usuarios Telegram"
            value={kpis.telegramUsers.current}
            delta={kpis.telegramUsers.delta}
            subtitle={`${kpis.telegramUsers.previous} anterior`}
            icon={Bot}
          />
          <KpiCard
            title="Onboarding Completo"
            value={kpis.onboardingCompleted.current}
            delta={kpis.onboardingCompleted.delta}
            subtitle={`${kpis.onboardingCompleted.previous} anterior`}
            icon={CheckCircle}
          />
          <KpiCard
            title="Feedback Pendente"
            value={kpis.pendingFeedback}
            icon={MessageSquare}
          />
        </div>
      ) : null}

      {/* Activity + Budgets + Roles row */}
      {activity && budgets && roles ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <ActivityCards activity={activity} />
          <BudgetCards budgets={budgets} />
          <RoleDistribution roles={roles} totalUsers={kpis?.totalUsers || 0} />
        </div>
      ) : null}

      {/* Engagement Section */}
      {engagement?.data && (
        <>
          <h2 className="text-lg font-semibold mt-2">Engajamento</h2>

          {/* Daily engagement chart */}
          <Card>
            <CardHeader className="pb-2 sm:pb-6">
              <CardTitle className="text-base sm:text-lg">
                Atividade Diaria
              </CardTitle>
            </CardHeader>
            <CardContent className="h-[250px] sm:h-[300px] px-2 sm:px-6">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={engagement.data.dailyChart}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(date: string) =>
                      format(parseISO(date), "dd MMM", { locale: ptBR })
                    }
                  />
                  <YAxis allowDecimals={false} />
                  <Tooltip
                    labelFormatter={(date: string) =>
                      format(parseISO(date), "dd 'de' MMMM 'de' yyyy", {
                        locale: ptBR,
                      })
                    }
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="transactions"
                    stroke="#8884d8"
                    name="Transacoes"
                    strokeWidth={2}
                  />
                  <Line
                    type="monotone"
                    dataKey="telegramMessages"
                    stroke="#ff7c43"
                    name="Mensagens Telegram"
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Engagement details row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <OnboardingFunnel funnel={engagement.data.onboardingFunnel} />
            <TransactionBreakdown
              bySource={engagement.data.transactionsBySource}
              byType={engagement.data.transactionsByType}
            />
            <TelegramResolutions
              resolutions={engagement.data.telegramResolutions}
            />
          </div>
        </>
      )}

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Daily Stats Chart */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2 sm:pb-6">
            <CardTitle className="text-base sm:text-lg">
              Crescimento de Usuarios (Ultimos 30 Dias)
            </CardTitle>
          </CardHeader>
          <CardContent className="h-[250px] sm:h-[350px] px-2 sm:px-6">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dailyStats?.data || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(date: string) =>
                    format(parseISO(date), "dd MMM", { locale: ptBR })
                  }
                />
                <YAxis allowDecimals={false} />
                <Tooltip
                  labelFormatter={(date: string) =>
                    format(parseISO(date), "dd 'de' MMMM 'de' yyyy", {
                      locale: ptBR,
                    })
                  }
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="users"
                  stroke="#8884d8"
                  name="Novos Usuarios"
                  strokeWidth={2}
                />
                <Line
                  type="monotone"
                  dataKey="waitlist"
                  stroke="#82ca9d"
                  name="Lista de Espera"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Plan Distribution Cards */}
      <div>
        <h2 className="text-lg font-semibold mb-3">
          Distribuicao de Usuarios por Plano
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {planStats?.data.map((plan) => (
            <Card
              key={plan.name}
              className={
                plan.name === "Sem Plano" || plan.name === "No Plan"
                  ? "border-dashed"
                  : ""
              }
            >
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">
                  {plan.name === "No Plan" ? "Sem Plano" : plan.name}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-1">
                  <div className="text-3xl font-bold">{plan.count}</div>
                  <div className="text-sm text-muted-foreground">
                    {((plan.count / totalUsers) * 100).toFixed(1)}% dos usuarios
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Cohort & Conversion Section */}
      {cohortData?.data && (
        <>
          <h2 className="text-lg font-semibold mt-2">Retencao e Conversao</h2>

          <CohortTable cohorts={cohortData.data.cohorts} />

          <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
            <ConversionMetrics
              conversion={cohortData.data.conversion}
              inactiveUsers30d={cohortData.data.inactiveUsers30d}
            />
          </div>
        </>
      )}
    </div>
  );
}
