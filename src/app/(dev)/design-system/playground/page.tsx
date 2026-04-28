"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "motion/react";
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
  Maximize2,
  X as XIcon,
  MessageCircle as MessageCircleIcon,
  Send as SendIcon,
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
  // ↓ extras only visible in the expanded view (simulate the scroll case)
  { name: "Saúde", icon: ShoppingCartIcon, sub: "30% usado", spent: 90, max: 300, tone: "ok" as const },
  { name: "Educação", icon: HomeIcon, sub: "60% usado", spent: 360, max: 600, tone: "ok" as const },
  { name: "Assinaturas", icon: PlaneIcon, sub: "95% usado", spent: 142, max: 150, tone: "warn" as const },
  { name: "Mercado livre", icon: ShoppingCartIcon, sub: "Pendente", spent: 0, max: 200, tone: "ok" as const },
  { name: "Pet", icon: HomeIcon, sub: "55% usado", spent: 110, max: 200, tone: "ok" as const },
  { name: "Restaurantes", icon: ShoppingCartIcon, sub: "Excedido em R$ 80", spent: 380, max: 300, tone: "over" as const },
  { name: "Roupas", icon: ShoppingCartIcon, sub: "20% usado", spent: 60, max: 300, tone: "ok" as const },
  { name: "Presentes", icon: HomeIcon, sub: "0% usado", spent: 0, max: 150, tone: "ok" as const },
  { name: "Cuidados pessoais", icon: ShoppingCartIcon, sub: "70% usado", spent: 140, max: 200, tone: "ok" as const },
  { name: "Imprevistos", icon: PlaneIcon, sub: "10% usado", spent: 50, max: 500, tone: "ok" as const },
];

const mockGoals = [
  { name: "Viagem Europa", icon: "✈️", progress: 49, target: "R$ 7.400 de R$ 15.000", color: "var(--brand-honey-500)" },
  { name: "Entrada apartamento", icon: "🏠", progress: 30, target: "R$ 18.200 de R$ 60.000", color: "var(--brand-violet-500)" },
  { name: "Reserva de emergência", icon: "🛟", progress: 72, target: "R$ 21.600 de R$ 30.000", color: "var(--success)" },
  // ↓ extras only visible in the expanded view (simulate the scroll case)
  { name: "Carro novo", icon: "🚗", progress: 18, target: "R$ 9.000 de R$ 50.000", color: "var(--brand-violet-500)" },
  { name: "Notebook do trabalho", icon: "💻", progress: 64, target: "R$ 5.120 de R$ 8.000", color: "var(--brand-honey-500)" },
  { name: "Casamento", icon: "💍", progress: 41, target: "R$ 12.300 de R$ 30.000", color: "var(--brand-violet-500)" },
  { name: "Curso de inglês", icon: "📚", progress: 92, target: "R$ 2.760 de R$ 3.000", color: "var(--success)" },
  { name: "Mudança", icon: "📦", progress: 12, target: "R$ 600 de R$ 5.000", color: "var(--brand-violet-500)" },
  { name: "Móveis", icon: "🛋️", progress: 28, target: "R$ 2.800 de R$ 10.000", color: "var(--brand-honey-500)" },
];

const mockChat: Array<{ side: "me" | "bot"; text: string; meta?: string }> = [
  { side: "me", text: "gastei 45 no ifood" },
  { side: "bot", text: "✅ Registrado! Alimentação · R$ 45,00\nAinda sobram R$ 144 este mês." },
  { side: "me", text: "📎 comprovante-pix.jpg" },
  { side: "bot", text: "✅ Mercado Extra · R$ 127,50\nCategoria: Alimentação · Maria pagou" },
  { side: "me", text: "quanto sobra de lazer?" },
  { side: "bot", text: "🎉 Vocês ainda têm R$ 165 em Lazer este mês." },
  { side: "me", text: "🎤 áudio (0:08)" },
  { side: "bot", text: "✅ Uber pro aeroporto · R$ 62 · Transporte" },
  { side: "me", text: "quanto falta pra europa?" },
  { side: "bot", text: "Vocês já têm R$ 7.400 guardados 🇮🇹\nFaltam R$ 7.600 · julho 2026" },
  { side: "me", text: "ufa, no ritmo certo!" },
  { side: "bot", text: "Bora! Continuem firmes. 💪" },
];

const mockScheduled = [
  { name: "Aluguel", day: 5, amount: -2100, type: "expense" as const, status: "today" as const },
  { name: "Salário João", day: 5, amount: 5200, type: "income" as const, status: "today" as const },
  { name: "Internet", day: 8, amount: -149, type: "expense" as const, status: "upcoming" as const },
  { name: "Cartão Nubank", day: 10, amount: -1820, type: "expense" as const, status: "upcoming" as const },
  { name: "Salário Maria", day: 15, amount: 4100, type: "income" as const, status: "upcoming" as const },
  // ↓ extras only visible in the expanded view (simulate the scroll case)
  { name: "Conta de luz", day: 12, amount: -240, type: "expense" as const, status: "upcoming" as const },
  { name: "Plano de saúde", day: 14, amount: -680, type: "expense" as const, status: "upcoming" as const },
  { name: "Streaming (Netflix)", day: 17, amount: -55, type: "expense" as const, status: "upcoming" as const },
  { name: "Streaming (Spotify)", day: 18, amount: -22, type: "expense" as const, status: "upcoming" as const },
  { name: "Mensalidade academia", day: 20, amount: -129, type: "expense" as const, status: "upcoming" as const },
  { name: "Aluguel de garagem", day: 22, amount: -180, type: "expense" as const, status: "upcoming" as const },
  { name: "Freela design", day: 25, amount: 1500, type: "income" as const, status: "upcoming" as const },
  { name: "Conta de água", day: 27, amount: -98, type: "expense" as const, status: "upcoming" as const },
  { name: "Cartão Itaú", day: 28, amount: -940, type: "expense" as const, status: "upcoming" as const },
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

type ExpandableState = "compact" | "expanded";

/* `ExpandableMockWidget` — Two distinct header actions:
   • "Ver tudo" → navigates to the widget's full page (`viewAllHref`).
   • Maximize2 icon → expands in place (FLIP-style: the card grows from
     its grid slot to a centered larger panel via motion's `layoutId`,
     matching the chat designer's intent of "movimento do lugar original
     enquanto aumenta de tamanho", not a fade-in modal).

   Children is a render-fn so each consumer decides what to show in each
   state — typically the compact view slices to top-N items, expanded
   shows the full list (and may include extra columns or actions). */
function ExpandableMockWidget({
  title,
  description,
  icon,
  viewAllHref = "#",
  children,
  expandedExtras,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  /** Where the "Ver tudo" button navigates. */
  viewAllHref?: string;
  children: (state: ExpandableState) => React.ReactNode;
  expandedExtras?: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);
  const reactId = React.useId();
  const layoutId = `widget-${reactId}`;

  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const transition = { type: "spring", stiffness: 320, damping: 32 } as const;

  const headerActions = (
    <div className="flex items-center gap-1">
      <Button asChild variant="ghost" size="sm" className="gap-1.5">
        <a href={viewAllHref}>
          <span className="hidden sm:inline">Ver tudo</span>
        </a>
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="size-8"
        onClick={() => setOpen(true)}
        aria-label={`Expandir ${title}`}
      >
        <Maximize2 className="size-4" />
      </Button>
    </div>
  );

  return (
    <>
      <motion.div
        layoutId={layoutId}
        transition={transition}
        className="cartoon-panel rounded-cartoon flex h-full flex-col gap-4 border bg-card p-6"
      >
        <div className="flex items-start gap-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 text-base font-semibold leading-none">
              {icon}
              {title}
            </div>
            <p className="mt-1.5 text-sm text-muted-foreground">{description}</p>
          </div>
          {headerActions}
        </div>
        <div className="flex-1">{children("compact")}</div>
      </motion.div>
      {mounted &&
        createPortal(
          <AnimatePresence>
            {open && (
              <>
                <motion.div
                  key="backdrop"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.18 }}
                  className="fixed inset-0 z-50 bg-background/70 backdrop-blur-sm"
                  onClick={() => setOpen(false)}
                />
                <motion.div
                  key="expanded"
                  layoutId={layoutId}
                  transition={transition}
                  className="cartoon-panel-strong fixed left-1/2 top-1/2 z-50 grid w-[calc(100%-2rem)] max-w-2xl -translate-x-1/2 -translate-y-1/2 gap-4 rounded-cartoon border bg-card p-6"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 text-base font-semibold leading-none">
                        {icon}
                        {title}
                      </div>
                      <p className="mt-1.5 text-sm text-muted-foreground">
                        {description}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setOpen(false)}
                      aria-label="Fechar"
                    >
                      <XIcon className="size-4" />
                    </Button>
                  </div>
                  {expandedExtras && (
                    <div className="flex flex-wrap gap-2 border-b pb-3">
                      {expandedExtras}
                    </div>
                  )}
                  <div className="max-h-[60vh] overflow-y-auto pr-1">
                    {children("expanded")}
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>,
          document.body
        )}
    </>
  );
}

function BudgetWidget() {
  const renderRow = (row: (typeof mockBudget)[number]) => {
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
  };

  return (
    <ExpandableMockWidget
      title="Orçamento de outubro"
      description="R$ 3.441 de R$ 3.700 · restam 12 dias"
      icon={<WalletIcon className="size-5" />}
      viewAllHref="/app/budget"
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
      {(state) => (
        <div className="space-y-4">
          {(state === "compact" ? mockBudget.slice(0, 4) : mockBudget).map(renderRow)}
        </div>
      )}
    </ExpandableMockWidget>
  );
}

function GoalsWidget() {
  const renderRow = (g: (typeof mockGoals)[number]) => (
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
        <Progress
          value={g.progress}
          className="mt-1.5 h-1.5"
          style={
            { background: "color-mix(in oklch, var(--muted) 60%, transparent)" } as React.CSSProperties
          }
        />
      </div>
    </div>
  );

  return (
    <ExpandableMockWidget
      title="Metas do casal"
      description={`${mockGoals.length} metas ativas`}
      icon={<TargetIcon className="size-5" />}
      viewAllHref="/app/goals"
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
      {(state) => (
        <div className="space-y-3">
          {(state === "compact" ? mockGoals.slice(0, 3) : mockGoals).map(renderRow)}
        </div>
      )}
    </ExpandableMockWidget>
  );
}

function ScheduledWidget() {
  const renderRow = (t: (typeof mockScheduled)[number]) => (
    <div
      key={t.name}
      className="flex items-center justify-between rounded-md px-2 py-2 hover:bg-accent/40"
    >
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
  );

  return (
    <ExpandableMockWidget
      title="Transações agendadas"
      description="Contas a pagar e receber neste mês"
      icon={<CalendarIcon className="size-5" />}
      viewAllHref="/app/transactions"
      expandedExtras={
        <>
          <Button size="sm">Pendentes ({mockScheduled.length})</Button>
          <Button size="sm" variant="outline">
            Atrasadas (0)
          </Button>
          <Button size="sm" variant="outline">
            Todas
          </Button>
        </>
      }
    >
      {(state) => (
        <div className="space-y-2">
          {(state === "compact" ? mockScheduled.slice(0, 4) : mockScheduled).map(renderRow)}
        </div>
      )}
    </ExpandableMockWidget>
  );
}

function ChatBubble({
  side,
  children,
}: {
  side: "me" | "bot";
  children: React.ReactNode;
}) {
  if (side === "me") {
    return (
      <div className="my-1 ml-auto max-w-[85%] whitespace-pre-line rounded-2xl rounded-br-sm bg-[oklch(0.93_0.06_150)] px-3.5 py-2 text-sm leading-snug text-[oklch(0.28_0.1_150)]">
        {children}
      </div>
    );
  }
  return (
    <div className="my-1 max-w-[85%] whitespace-pre-line rounded-2xl rounded-bl-sm bg-muted px-3.5 py-2 text-sm leading-snug text-foreground">
      {children}
    </div>
  );
}

function ChatComposer({ size = "sm" }: { size?: "sm" | "default" }) {
  return (
    <form
      className="cartoon-input flex items-center gap-2 rounded-full bg-card pl-3 pr-1 py-1"
      onSubmit={(e) => e.preventDefault()}
    >
      <input
        type="text"
        placeholder="gastei 80 no mercado..."
        className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
      />
      <Button
        type="submit"
        size="icon"
        className={size === "default" ? "size-9 rounded-full" : "size-8 rounded-full"}
        aria-label="Enviar"
      >
        <SendIcon className="size-4" />
      </Button>
    </form>
  );
}

function ChatWidget() {
  return (
    <ExpandableMockWidget
      title="Assistente"
      description="Registre gastos por mensagem"
      icon={<MessageCircleIcon className="size-5" />}
      viewAllHref="/app/settings"
      expandedExtras={
        <>
          <Button size="sm" variant="outline">
            Histórico completo
          </Button>
          <Button size="sm" variant="outline">
            Conectar WhatsApp
          </Button>
        </>
      }
    >
      {(state) => {
        const messages = state === "compact" ? mockChat.slice(-3) : mockChat;
        return (
          <div className="flex h-full flex-col gap-3">
            <div
              className={
                state === "compact"
                  ? "flex flex-col"
                  : "flex flex-col"
              }
            >
              {messages.map((m, i) => (
                <ChatBubble key={i} side={m.side}>
                  {m.text}
                </ChatBubble>
              ))}
            </div>
            {state === "expanded" && (
              <div className="sticky bottom-0 mt-auto pt-2">
                <ChatComposer size="default" />
              </div>
            )}
            {state === "compact" && (
              <div className="mt-auto">
                <ChatComposer />
              </div>
            )}
          </div>
        );
      }}
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
        description="Card clicável com ações rápidas no header (Ver tudo + Expandir). O expand cresce do slot original via FLIP, com scroll dentro e quick actions extras."
      >
        <div className="grid gap-5 lg:grid-cols-2">
          <BudgetWidget />
          <GoalsWidget />
          <ScheduledWidget />
          <ChatWidget />

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
