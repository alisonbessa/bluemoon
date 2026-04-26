"use client";

import * as React from "react";
import {
  PlusIcon,
  WalletIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  TargetIcon,
  ShoppingCartIcon,
  HomeIcon,
  CarIcon,
  PlaneIcon,
  CalendarIcon,
  CheckIcon,
  ClockIcon,
  ArrowRightIcon,
  MaximizeIcon,
} from "lucide-react";

import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import { Progress } from "@/shared/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/shared/ui/dialog";

import { PageHeading, Showcase } from "../_components/showcase";

/* -------------------------------------------------------------------------- */
/*  Mock data                                                                  */
/* -------------------------------------------------------------------------- */

const mockStats = [
  {
    id: "balance",
    label: "Saldo do mês",
    value: "R$ 4.820,50",
    delta: "+12% vs setembro",
    deltaTone: "up" as const,
    icon: <WalletIcon className="size-4" />,
  },
  {
    id: "expenses",
    label: "Gastos do mês",
    value: "R$ 3.140,75",
    delta: "Restam R$ 559 do orçamento",
    deltaTone: "down" as const,
    icon: <TrendingDownIcon className="size-4" />,
  },
  {
    id: "savings",
    label: "Economia conjunta",
    value: "R$ 1.260,00",
    delta: "Rumo à viagem 🇮🇹",
    deltaTone: "up" as const,
    icon: <TrendingUpIcon className="size-4" />,
  },
];

const mockBudget = [
  { name: "Alimentação", icon: ShoppingCartIcon, sub: "82% usado", spent: 656, max: 800, tone: "warn" as const },
  { name: "Moradia", icon: HomeIcon, sub: "No orçamento", spent: 2100, max: 2100, tone: "ok" as const },
  { name: "Transporte", icon: CarIcon, sub: "Excedido em R$ 50", spent: 550, max: 500, tone: "over" as const },
  { name: "Lazer", icon: PlaneIcon, sub: "45% usado", spent: 135, max: 300, tone: "ok" as const },
];

const mockGoals = [
  { name: "Viagem Europa", icon: "✈️", progress: 49, target: "R$ 7.400 de R$ 15.000", color: "var(--brand-honey-500)" },
  { name: "Entrada apartamento", icon: "🏠", progress: 30, target: "R$ 18.200 de R$ 60.000", color: "var(--brand-violet-500)" },
  { name: "Reserva de emergência", icon: "🛟", progress: 72, target: "R$ 21.600 de R$ 30.000", color: "var(--success)" },
];

const mockScheduled = [
  { name: "Aluguel", day: 5, amount: -2100, type: "expense" as const, status: "today" as const },
  { name: "Salário João", day: 5, amount: 5200, type: "income" as const, status: "today" as const },
  { name: "Internet", day: 8, amount: -149, type: "expense" as const, status: "upcoming" as const },
  { name: "Cartão Nubank", day: 10, amount: -1820, type: "expense" as const, status: "upcoming" as const },
  { name: "Salário Maria", day: 15, amount: 4100, type: "income" as const, status: "upcoming" as const },
];

function formatBRL(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/* -------------------------------------------------------------------------- */
/*  Mock widgets                                                               */
/* -------------------------------------------------------------------------- */

function StatCard({ s }: { s: (typeof mockStats)[number] }) {
  return (
    <Card className="gap-3 py-5">
      <CardHeader className="px-5">
        <div className="flex items-center justify-between text-muted-foreground">
          <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide">
            {s.icon}
            {s.label}
          </span>
        </div>
        <div className="text-2xl font-extrabold tabular-nums tracking-tight">
          {s.value}
        </div>
        <CardDescription
          className={s.deltaTone === "up" ? "text-success" : "text-destructive"}
        >
          {s.delta}
        </CardDescription>
      </CardHeader>
    </Card>
  );
}

function ExpandableMockWidget({
  title,
  description,
  icon,
  children,
  expandedExtras,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  expandedExtras?: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <Card className="flex h-full flex-col gap-4">
        <CardHeader className="flex-row items-start gap-3">
          <div className="flex-1">
            <CardTitle className="flex items-center gap-2 text-base">
              {icon}
              {title}
            </CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1 px-2 text-xs"
              onClick={() => setOpen(true)}
            >
              Ver tudo
              <ArrowRightIcon className="size-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              aria-label="Expandir"
              onClick={() => setOpen(true)}
            >
              <MaximizeIcon className="size-3.5" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>{children}</CardContent>
      </Card>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {icon}
              {title}
            </DialogTitle>
            <CardDescription>{description}</CardDescription>
          </DialogHeader>
          {expandedExtras && (
            <div className="flex flex-wrap gap-2 border-b pb-3">{expandedExtras}</div>
          )}
          <div className="max-h-[60vh] overflow-y-auto">{children}</div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function BudgetWidget() {
  return (
    <ExpandableMockWidget
      title="Orçamento de outubro"
      description="R$ 3.441 de R$ 3.700 · restam 12 dias"
      icon={<WalletIcon className="size-5" />}
      expandedExtras={
        <>
          <Button size="sm">
            <PlusIcon className="size-3.5" />
            Nova categoria
          </Button>
          <Button size="sm" variant="outline">
            Ver mês passado
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {mockBudget.map((row) => {
          const pct = Math.min(110, (row.spent / row.max) * 100);
          const tone =
            row.tone === "over"
              ? "var(--destructive)"
              : row.tone === "warn"
              ? "var(--warning)"
              : "var(--primary)";
          return (
            <div key={row.name} className="flex items-center gap-3">
              <div
                className="flex size-9 items-center justify-center rounded-md bg-accent text-accent-foreground"
                style={{ border: "1.5px solid var(--ink)", boxShadow: "var(--shadow-cartoon-xs)" }}
              >
                <row.icon className="size-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex justify-between text-sm">
                  <span className="font-semibold">{row.name}</span>
                  <span
                    className="tabular-nums font-bold"
                    style={{ color: row.tone === "over" ? "var(--destructive)" : undefined }}
                  >
                    {formatBRL(row.spent)}{" "}
                    <span className="font-normal text-muted-foreground">
                      / {formatBRL(row.max)}
                    </span>
                  </span>
                </div>
                <div className="text-xs text-muted-foreground">{row.sub}</div>
                <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full" style={{ width: `${pct}%`, background: tone }} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </ExpandableMockWidget>
  );
}

function GoalsWidget() {
  return (
    <ExpandableMockWidget
      title="Metas do casal"
      description="3 metas ativas"
      icon={<TargetIcon className="size-5" />}
      expandedExtras={
        <>
          <Button size="sm">
            <PlusIcon className="size-3.5" />
            Nova meta
          </Button>
          <Button size="sm" variant="outline">
            Ver concluídas (2)
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        {mockGoals.map((g) => (
          <div key={g.name} className="flex items-center gap-3">
            <div
              className="flex size-10 items-center justify-center rounded-md bg-secondary text-lg"
              style={{ border: "1.5px solid var(--ink)", boxShadow: "var(--shadow-cartoon-xs)" }}
            >
              {g.icon}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex justify-between text-sm">
                <span className="font-semibold">{g.name}</span>
                <span className="text-muted-foreground">{g.progress}%</span>
              </div>
              <div className="text-xs text-muted-foreground">{g.target}</div>
              <Progress value={g.progress} className="mt-1.5 h-1.5" style={{ background: "color-mix(in oklch, var(--muted) 60%, transparent)" } as React.CSSProperties} />
            </div>
          </div>
        ))}
      </div>
    </ExpandableMockWidget>
  );
}

function ScheduledWidget() {
  return (
    <ExpandableMockWidget
      title="Transações agendadas"
      description="Contas a pagar e receber neste mês"
      icon={<CalendarIcon className="size-5" />}
      expandedExtras={
        <>
          <Button size="sm">Pendentes ({mockScheduled.length})</Button>
          <Button size="sm" variant="outline">Atrasadas (0)</Button>
          <Button size="sm" variant="outline">Todas</Button>
        </>
      }
    >
      <div className="space-y-2">
        {mockScheduled.map((t) => (
          <div key={t.name} className="flex items-center justify-between rounded-md px-2 py-2 hover:bg-accent/40">
            <div className="flex items-center gap-2 text-sm">
              {t.status === "today" ? (
                <ClockIcon className="size-4 text-warning" />
              ) : (
                <CalendarIcon className="size-4 text-muted-foreground" />
              )}
              <span className="font-semibold">{t.name}</span>
              {t.status === "today" && <Badge variant="secondary">HOJE</Badge>}
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span
                className={
                  t.type === "income"
                    ? "tabular-nums font-bold text-success"
                    : "tabular-nums font-bold text-destructive"
                }
              >
                {t.type === "income" ? "+" : "−"} {formatBRL(Math.abs(t.amount))}
              </span>
              <Button variant="ghost" size="icon" className="h-7 w-7">
                <CheckIcon className="size-3.5" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </ExpandableMockWidget>
  );
}

/* -------------------------------------------------------------------------- */
/*  Page                                                                       */
/* -------------------------------------------------------------------------- */

export default function PlaygroundPage() {
  const [scope, setScope] = React.useState<"all" | "mine" | "ours">("all");
  return (
    <div className="space-y-8">
      <PageHeading
        title="Playground"
        description="Mocks dos componentes do dashboard com dados fake — para iterar visual e comportamento antes de aplicar na app."
      />

      <Showcase
        title="Header da home"
        description="Saudação manuscrita, escopo de visualização e ação primária."
      >
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Terça, 22 de outubro
            </p>
            <h1 className="text-3xl font-extrabold tracking-tight">
              Oi, <span className="font-hand text-[1.35em] font-bold text-primary">Maria</span>
            </h1>
            <p className="text-sm text-muted-foreground">
              Vocês estão no caminho certo este mês.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="cartoon-chrome inline-flex items-center gap-0 rounded-full bg-card p-1">
              {(["all", "mine", "ours"] as const).map((s) => (
                <button
                  key={s}
                  data-state={scope === s ? "checked" : undefined}
                  onClick={() => setScope(s)}
                  className={
                    "rounded-full px-3 py-1 text-xs font-bold transition-colors " +
                    (scope === s
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground")
                  }
                >
                  {s === "all" ? "Tudo" : s === "mine" ? "Meu" : "Nosso"}
                </button>
              ))}
            </div>
            <Button>
              <PlusIcon className="size-4" />
              Novo gasto
            </Button>
          </div>
        </div>
      </Showcase>

      <Showcase title="Stat cards (saldo / gastos / economia)">
        <div className="grid gap-4 sm:grid-cols-3">
          {mockStats.map((s) => (
            <StatCard key={s.id} s={s} />
          ))}
        </div>
      </Showcase>

      <Showcase
        title="Widgets expansíveis"
        description="Card clicável com ações rápidas no header (Ver tudo + Expandir). O modal abre com quick actions extras."
      >
        <div className="grid gap-5 lg:grid-cols-2">
          <BudgetWidget />
          <GoalsWidget />
          <ScheduledWidget />

          {/* Quick form preview to validate Input + Button cartoon */}
          <Card className="gap-4">
            <CardHeader>
              <CardTitle>Novo lançamento rápido</CardTitle>
              <CardDescription>Adicione um gasto sem sair da home.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input placeholder="O que foi gasto? (ex: ifood)" />
              <div className="grid grid-cols-2 gap-3">
                <Input placeholder="R$ 0,00" type="text" />
                <Input placeholder="Categoria" />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm">Cancelar</Button>
                <Button size="sm">
                  <PlusIcon className="size-3.5" />
                  Registrar
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </Showcase>

      <Showcase
        title="Trigger expandido (preview standalone)"
        description="Abrir o dialog direto, sem passar pelo card."
      >
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline">Abrir modal cartoon</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Modal com sombra cartoon-lg</DialogTitle>
              <CardDescription>
                Borda hand-drawn via filtro SVG, sombra hard-offset 6px.
              </CardDescription>
            </DialogHeader>
            <p className="text-sm">
              O conteúdo do modal renderiza normalmente — os elementos internos não
              sofrem distorção, apenas a borda fica wobbly.
            </p>
          </DialogContent>
        </Dialog>
      </Showcase>
    </div>
  );
}
