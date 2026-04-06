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
import { format, parseISO, subDays, startOfDay, startOfWeek, startOfMonth, startOfQuarter, startOfYear, endOfDay, endOfWeek, endOfMonth, endOfQuarter, endOfYear, subWeeks, subMonths, subQuarters, subYears } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useState, useMemo } from "react";
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
  Calendar,
  ArrowRight,
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/shared/ui/tabs";

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
    dau: KpiMetric;
    wau: KpiMetric;
    mau: KpiMetric;
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
  prevDailyChart?: { date: string; transactions: number; telegramMessages: number }[];
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

type PeriodKey = "day" | "week" | "month" | "quarter" | "year";

interface PeriodRange {
  start: Date;
  end: Date;
  prevStart: Date;
  prevEnd: Date;
  days: number;
  label: string;
  prevLabel: string;
}

const PERIOD_OPTIONS: { key: PeriodKey; label: string }[] = [
  { key: "day", label: "Dia" },
  { key: "week", label: "Semana" },
  { key: "month", label: "Mes" },
  { key: "quarter", label: "Trimestre" },
  { key: "year", label: "Ano" },
];

function computePeriodRange(key: PeriodKey): PeriodRange {
  const now = new Date();
  const fmt = (d: Date) => format(d, "dd MMM", { locale: ptBR });
  const fmtFull = (d: Date) => format(d, "dd MMM yy", { locale: ptBR });

  switch (key) {
    case "day": {
      const start = startOfDay(now);
      const end = endOfDay(now);
      const prevStart = startOfDay(subDays(now, 1));
      const prevEnd = endOfDay(subDays(now, 1));
      return { start, end, prevStart, prevEnd, days: 1, label: "Hoje", prevLabel: "Ontem" };
    }
    case "week": {
      const start = startOfWeek(now, { weekStartsOn: 1 });
      const end = endOfWeek(now, { weekStartsOn: 1 });
      const prevStart = startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
      const prevEnd = endOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
      return { start, end, prevStart, prevEnd, days: 7, label: `${fmt(start)} - ${fmt(end)}`, prevLabel: `${fmt(prevStart)} - ${fmt(prevEnd)}` };
    }
    case "month": {
      const start = startOfMonth(now);
      const end = endOfMonth(now);
      const prevStart = startOfMonth(subMonths(now, 1));
      const prevEnd = endOfMonth(subMonths(now, 1));
      return { start, end, prevStart, prevEnd, days: 30, label: format(now, "MMMM yyyy", { locale: ptBR }), prevLabel: format(subMonths(now, 1), "MMMM yyyy", { locale: ptBR }) };
    }
    case "quarter": {
      const start = startOfQuarter(now);
      const end = endOfQuarter(now);
      const prevStart = startOfQuarter(subQuarters(now, 1));
      const prevEnd = endOfQuarter(subQuarters(now, 1));
      return { start, end, prevStart, prevEnd, days: 90, label: `${fmt(start)} - ${fmtFull(end)}`, prevLabel: `${fmt(prevStart)} - ${fmtFull(prevEnd)}` };
    }
    case "year": {
      const start = startOfYear(now);
      const end = endOfYear(now);
      const prevStart = startOfYear(subYears(now, 1));
      const prevEnd = endOfYear(subYears(now, 1));
      return { start, end, prevStart, prevEnd, days: 365, label: format(now, "yyyy"), prevLabel: format(subYears(now, 1), "yyyy") };
    }
  }
}

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

function Sparkline({ data, color = "#8884d8", height = 28 }: { data: number[]; color?: string; height?: number }) {
  if (data.length < 2) return null;
  const max = Math.max(...data, 1);
  const width = 80;
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - (v / max) * (height - 2);
    return `${x},${y}`;
  }).join(" ");

  return (
    <svg width={width} height={height} className="shrink-0">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

function KpiCard({
  title,
  value,
  subtitle,
  delta,
  icon: Icon,
  sparklineData,
  sparklineColor,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  delta?: number;
  icon: React.ComponentType<{ className?: string }>;
  sparklineData?: number[];
  sparklineColor?: string;
}) {
  return (
    <Card>
      <CardContent className="pt-4 pb-3 px-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1 min-w-0 flex-1">
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
          <div className="flex flex-col items-end gap-1 shrink-0">
            <div className="rounded-md bg-muted p-2">
              <Icon className="h-4 w-4 text-muted-foreground" />
            </div>
            {sparklineData && sparklineData.length > 1 && (
              <Sparkline data={sparklineData} color={sparklineColor} height={24} />
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function PeriodSelector({
  value,
  onChange,
  range,
}: {
  value: PeriodKey;
  onChange: (v: PeriodKey) => void;
  range: PeriodRange;
}) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
      <Tabs value={value} onValueChange={(v) => onChange(v as PeriodKey)}>
        <TabsList>
          {PERIOD_OPTIONS.map((opt) => (
            <TabsTrigger key={opt.key} value={opt.key} className="text-xs px-3">
              {opt.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Calendar className="h-3.5 w-3.5" />
        <span className="capitalize font-medium text-foreground">{range.label}</span>
        <span>vs</span>
        <span className="capitalize">{range.prevLabel}</span>
      </div>
    </div>
  );
}

function ActivityCards({ activity, totalUsers }: { activity: OverviewData["activity"]; totalUsers: number }) {
  const items = [
    { label: "Hoje", sublabel: "vs ontem", metric: activity.dau },
    { label: "Semana", sublabel: "vs semana passada", metric: activity.wau },
    { label: "Mes", sublabel: "vs mes passado", metric: activity.mau },
  ];

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Usuarios Ativos</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 divide-x">
          {items.map((item) => {
            const pctOfTotal = totalUsers > 0 ? Math.round((item.metric.current / totalUsers) * 100) : 0;
            return (
              <div key={item.label} className="text-center px-3 space-y-1">
                <p className="text-2xl font-bold tabular-nums">{item.metric.current}</p>
                <DeltaBadge delta={item.metric.delta} />
                <p className="text-xs text-muted-foreground">
                  {item.label}
                </p>
                <p className="text-[10px] text-muted-foreground/70">
                  {item.metric.previous} anterior · {pctOfTotal}% do total
                </p>
              </div>
            );
          })}
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

  // Month labels
  const monthLabels: Record<string, string> = {
    "01": "Jan", "02": "Fev", "03": "Mar", "04": "Abr",
    "05": "Mai", "06": "Jun", "07": "Jul", "08": "Ago",
    "09": "Set", "10": "Out", "11": "Nov", "12": "Dez",
  };

  // Heatmap color with opacity gradient
  const getHeatmapStyle = (pct: number): React.CSSProperties => {
    if (pct === 0) return {};
    // Green gradient: higher retention = more saturated green
    const intensity = Math.min(pct / 100, 1);
    return {
      backgroundColor: `rgba(34, 197, 94, ${intensity * 0.5 + 0.05})`,
      color: intensity > 0.5 ? "rgb(20, 83, 45)" : undefined,
    };
  };

  const getHeatmapDarkStyle = (pct: number): string => {
    if (pct >= 60) return "dark:text-emerald-200";
    if (pct >= 30) return "dark:text-emerald-300";
    if (pct > 0) return "dark:text-emerald-400";
    return "";
  };

  // Compute average retention per month offset
  const avgRetention: number[] = [];
  for (let i = 0; i < sortedMonths.length; i++) {
    const m = sortedMonths[i];
    let sum = 0, count = 0;
    for (const c of cohorts) {
      if (c.retention[m] !== undefined && m >= c.cohort) {
        const pct = c.cohortSize > 0 ? Math.round((c.retention[m] / c.cohortSize) * 100) : 0;
        sum += pct;
        count++;
      }
    }
    avgRetention.push(count > 0 ? Math.round(sum / count) : 0);
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          Retencao por Cohort
          <span className="text-xs font-normal text-muted-foreground">(mensal)</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="text-left py-2 pr-4 font-medium text-muted-foreground text-xs">
                Cohort
              </th>
              <th className="text-center py-2 px-3 font-medium text-muted-foreground text-xs">
                Usuarios
              </th>
              {sortedMonths.map((m) => {
                const monthNum = m.slice(5);
                return (
                  <th key={m} className="text-center py-2 px-1 font-medium text-muted-foreground text-xs min-w-[56px]">
                    {monthLabels[monthNum] || monthNum}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {cohorts.map((c) => (
              <tr key={c.cohort} className="border-b last:border-0">
                <td className="py-2 pr-4 font-medium text-xs whitespace-nowrap">
                  {(() => {
                    const monthNum = c.cohort.slice(5);
                    return `${monthLabels[monthNum] || monthNum} ${c.cohort.slice(0, 4)}`;
                  })()}
                </td>
                <td className="text-center py-2 px-3 tabular-nums text-xs font-medium">
                  {c.cohortSize}
                </td>
                {sortedMonths.map((m) => {
                  const active = c.retention[m];
                  if (active === undefined || m < c.cohort) {
                    return (
                      <td key={m} className="text-center py-1.5 px-1">
                        <span className="text-muted-foreground/20">&mdash;</span>
                      </td>
                    );
                  }
                  const pct = c.cohortSize > 0 ? Math.round((active / c.cohortSize) * 100) : 0;
                  const isSelf = m === c.cohort;
                  return (
                    <td key={m} className="text-center py-1.5 px-1">
                      <div
                        className={`inline-flex items-center justify-center min-w-[44px] px-1.5 py-1 rounded-md text-xs font-semibold tabular-nums transition-colors ${getHeatmapDarkStyle(pct)} ${isSelf ? "ring-1 ring-primary/30" : ""}`}
                        style={getHeatmapStyle(pct)}
                        title={`${active} de ${c.cohortSize} usuarios ativos`}
                      >
                        {pct}%
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
            {/* Average row */}
            <tr className="border-t-2">
              <td className="py-2 pr-4 text-xs font-medium text-muted-foreground">Media</td>
              <td className="text-center py-2 px-3" />
              {sortedMonths.map((m, i) => (
                <td key={m} className="text-center py-1.5 px-1">
                  {avgRetention[i] > 0 ? (
                    <span className="text-xs font-medium tabular-nums text-muted-foreground">
                      {avgRetention[i]}%
                    </span>
                  ) : (
                    <span className="text-muted-foreground/20">&mdash;</span>
                  )}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
        <div className="flex items-center gap-3 mt-4">
          <p className="text-xs text-muted-foreground flex-1">
            % de usuarios que criaram pelo menos 1 transacao no mes
          </p>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span>0%</span>
            <div className="flex gap-px">
              {[10, 25, 40, 60, 80].map((v) => (
                <div
                  key={v}
                  className="w-4 h-3 rounded-sm"
                  style={{ backgroundColor: `rgba(34, 197, 94, ${(v / 100) * 0.5 + 0.05})` }}
                />
              ))}
            </div>
            <span>100%</span>
          </div>
        </div>
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
  const [periodKey, setPeriodKey] = useState<PeriodKey>("month");
  const range = useMemo(() => computePeriodRange(periodKey), [periodKey]);
  const days = range.days;

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
      <PeriodSelector value={periodKey} onChange={setPeriodKey} range={range} />

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
            sparklineData={engagement?.data.dailyChart.map((d) => d.transactions)}
            sparklineColor="#8884d8"
          />
          <KpiCard
            title="Usuarios Telegram"
            value={kpis.telegramUsers.current}
            delta={kpis.telegramUsers.delta}
            subtitle={`${kpis.telegramUsers.previous} anterior`}
            icon={Bot}
            sparklineData={engagement?.data.dailyChart.map((d) => d.telegramMessages)}
            sparklineColor="#ff7c43"
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
          <ActivityCards activity={activity} totalUsers={kpis?.totalUsers || 0} />
          <BudgetCards budgets={budgets} />
          <RoleDistribution roles={roles} totalUsers={kpis?.totalUsers || 0} />
        </div>
      ) : null}

      {/* Engagement Section */}
      {engagement?.data && (
        <>
          <h2 className="text-lg font-semibold mt-2">Engajamento</h2>

          {/* Daily engagement chart with previous period overlay */}
          <Card>
            <CardHeader className="pb-2 sm:pb-6">
              <CardTitle className="text-base sm:text-lg">
                Atividade Diaria
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Linhas tracejadas = periodo anterior
              </p>
            </CardHeader>
            <CardContent className="h-[250px] sm:h-[300px] px-2 sm:px-6">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={(() => {
                  const current = engagement.data.dailyChart;
                  const prev = engagement.data.prevDailyChart ?? [];
                  return current.map((item, i) => ({
                    ...item,
                    dayLabel: format(parseISO(item.date), "dd MMM", { locale: ptBR }),
                    prevTransactions: prev[i]?.transactions ?? 0,
                    prevTelegramMessages: prev[i]?.telegramMessages ?? 0,
                  }));
                })()}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="dayLabel"
                    interval={days <= 7 ? 0 : undefined}
                  />
                  <YAxis allowDecimals={false} />
                  <Tooltip
                    labelFormatter={(_: string, payload: Array<{ payload?: { date?: string } }>) => {
                      const date = payload?.[0]?.payload?.date;
                      if (!date) return "";
                      return format(parseISO(date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
                    }}
                  />
                  <Legend />
                  {/* Previous period - dashed, lighter */}
                  <Line
                    type="monotone"
                    dataKey="prevTransactions"
                    stroke="#8884d8"
                    strokeOpacity={0.3}
                    strokeWidth={1.5}
                    strokeDasharray="5 5"
                    name="Transacoes (anterior)"
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="prevTelegramMessages"
                    stroke="#ff7c43"
                    strokeOpacity={0.3}
                    strokeWidth={1.5}
                    strokeDasharray="5 5"
                    name="Telegram (anterior)"
                    dot={false}
                  />
                  {/* Current period - solid */}
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
              Crescimento de Usuarios
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
