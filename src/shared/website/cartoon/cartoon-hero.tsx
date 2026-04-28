import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Avatar, AvatarImage } from "@/shared/ui/avatar";
import { appConfig } from "@/shared/lib/config";

const TESTIMONIAL_AVATARS = [
  { seed: "Maria", alt: "Maria" },
  { seed: "Joao", alt: "João" },
  { seed: "Ana", alt: "Ana" },
  { seed: "Carlos", alt: "Carlos" },
  { seed: "Lucia", alt: "Lúcia" },
];

export function CartoonHero() {
  return (
    <section className="hb-honeycomb-bg relative overflow-hidden px-6 py-22 md:py-28">
      {/* Decorative hexagon */}
      <svg
        className="pointer-events-none absolute right-[-60px] top-10 hidden h-64 w-64 opacity-15 md:block"
        viewBox="0 0 100 100"
        fill="none"
        aria-hidden
      >
        <path
          d="M50 2 L92 26 V74 L50 98 L8 74 V26 Z"
          stroke="oklch(0.68 0.16 295)"
          strokeWidth={1.5}
        />
      </svg>

      <div className="relative mx-auto grid max-w-(--breakpoint-xl) items-center gap-14 md:grid-cols-[1.1fr_1fr]">
        <div>
          {/* Eyebrow chip */}
          <span className="cartoon-chrome inline-flex items-center gap-2 rounded-full bg-secondary px-3 py-1.5 text-xs font-bold text-secondary-foreground">
            <span className="hb-pulse-dot" aria-hidden />
            🐝 {appConfig.waitlistMode ? "Beta aberto · sem cobrança" : "Feito para casais brasileiros"}
          </span>

          <h1 className="mt-5 text-4xl font-extrabold leading-[1.04] tracking-tight md:text-[58px]">
            <span className="font-hand mr-1.5 inline-block text-[1.05em] font-bold leading-none text-primary -rotate-2">
              Oi, casal —
            </span>
            <br />
            organizem o dinheiro{" "}
            <span className="hb-honey-underline">juntos</span>, sem planilha e sem briga.
          </h1>

          <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted-foreground">
            Planejem o mês, registrem gastos por mensagem no WhatsApp e saibam pra onde
            foi cada real. Vocês dois, no mesmo time.
          </p>

          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Button size="lg" asChild>
              <Link href={appConfig.waitlistMode ? "/beta" : "#pricing"}>
                Comecem grátis
                <ArrowRight className="ml-1 size-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="#como-funciona">Ver como funciona</Link>
            </Button>
          </div>

          {appConfig.waitlistMode && (
            <p className="mt-4 flex items-center gap-1.5 text-xs text-muted-foreground">
              <Check className="size-3.5 text-[var(--success)]" />
              Sem cartão. Sem compromisso. Enquanto dura o beta, é de graça.
            </p>
          )}

          <div className="mt-8 flex flex-wrap items-center gap-4">
            <div className="-space-x-2 inline-flex">
              {TESTIMONIAL_AVATARS.map((p) => (
                <Avatar
                  key={p.seed}
                  className="size-10 border-2 border-background bg-card"
                >
                  <AvatarImage
                    src={`https://api.dicebear.com/9.x/lorelei/svg?seed=${p.seed}`}
                    alt={p.alt}
                  />
                </Avatar>
              ))}
            </div>
            <div className="text-xs leading-snug text-muted-foreground">
              <b className="block text-[13px] text-foreground">
                +120 casais no beta
              </b>
              <span className="inline-flex gap-px text-[oklch(0.78_0.17_85)]">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} />
                ))}
              </span>
              <span className="ml-1">nota média 4,9</span>
            </div>
          </div>
        </div>

        {/* Hero visual — cartoon device */}
        <div className="relative">
          <div className="hb-blob-mandou-bem font-hand pointer-events-none absolute -right-2 -top-7 z-10 inline-flex rotate-6 items-center gap-1.5 rounded-2xl rounded-br-[4px] border-[1.5px] border-[var(--ink)] bg-card px-3.5 py-2 text-2xl font-bold shadow-[var(--shadow-cartoon-sm)]">
            mandou bem!
          </div>
          <div className="pointer-events-none absolute -bottom-3 -left-5 z-10 inline-flex -rotate-[5deg] items-center gap-1.5 rounded-xl border-[1.5px] border-[var(--ink)] bg-secondary px-3.5 py-2.5 text-sm font-bold text-secondary-foreground shadow-[var(--shadow-cartoon-sm)]">
            🍯 + R$ 1.260 pra meta Europa
          </div>

          <div className="-rotate-[1.5deg] rounded-3xl border-2 border-[var(--ink)] bg-card p-4 shadow-[var(--shadow-cartoon-lg)]">
            {/* device head */}
            <div className="mb-3 flex items-center gap-2.5 border-b-[1.5px] border-border px-1 pb-3 pt-1">
              <div className="flex size-9 items-center justify-center rounded-full border-[1.5px] border-[var(--ink)] bg-primary text-xs font-extrabold text-primary-foreground">
                HB
              </div>
              <div className="flex-1">
                <div className="text-sm font-bold">HiveBudget Bot</div>
                <div className="flex items-center gap-1.5 text-[11px] text-[var(--success)]">
                  <span className="size-1.5 rounded-full bg-[var(--success)]" />
                  WhatsApp
                </div>
              </div>
            </div>
            {/* messages */}
            <ChatBubble side="me">gastei 45 no ifood</ChatBubble>
            <p className="mr-1 text-right text-[11px] text-muted-foreground">14:02 ✓✓</p>
            <ChatBubble side="bot">
              <b className="text-[var(--brand-violet-700)]">✅ Registrado!</b>
              <br />
              Alimentação · R$ 45,00
              <br />
              Ainda sobram R$ 144 este mês.
            </ChatBubble>
            <ChatBubble side="me">quanto falta pra europa?</ChatBubble>
            <ChatBubble side="bot">
              Vocês já têm <b className="text-[var(--brand-violet-700)]">R$ 7.400</b> guardados 🇮🇹
              <br />
              Faltam R$ 7.600 · julho 2026
            </ChatBubble>
          </div>
        </div>
      </div>
    </section>
  );
}

function Star() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="size-3.5">
      <path d="M12 2l3 7h7l-5.5 4 2 7L12 16l-6.5 4 2-7L2 9h7z" />
    </svg>
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
      <div className="my-1.5 ml-auto max-w-[85%] rounded-2xl rounded-br-[4px] bg-[oklch(0.93_0.06_150)] px-3.5 py-2.5 text-sm leading-snug text-[oklch(0.28_0.1_150)]">
        {children}
      </div>
    );
  }
  return (
    <div className="my-1.5 max-w-[85%] rounded-2xl rounded-bl-[4px] bg-muted px-3.5 py-2.5 text-sm leading-snug text-foreground">
      {children}
    </div>
  );
}
