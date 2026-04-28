import Link from "next/link";
import { Check, ArrowRight } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { appConfig } from "@/shared/lib/config";

const BULLETS = [
  {
    text: (
      <>
        Texto:{" "}
        <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[13.5px] text-(--brand-violet-700)">
          gastei 80 no mercado
        </span>
      </>
    ),
  },
  { text: <>Foto de nota fiscal ou comprovante Pix — transcrevemos.</> },
  { text: <>Áudio quando tão correndo: ouvimos e registramos.</> },
  {
    text: (
      <>
        Consultas rápidas:{" "}
        <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[13.5px] text-(--brand-violet-700)">
          quanto sobra de lazer?
        </span>
      </>
    ),
  },
  { text: <>Alertas gentis quando o mês tá apertando.</> },
];

export function CartoonTelegramFeature() {
  return (
    <section className="px-6 py-22 md:py-28">
      <div className="mx-auto grid max-w-(--breakpoint-xl) items-center gap-14 md:grid-cols-2">
        <div>
          <p className="font-hand mb-1 inline-block -rotate-1 text-2xl font-bold text-primary">
            Por mensagem
          </p>
          <h2 className="text-3xl font-extrabold tracking-tight md:text-[42px] md:leading-[1.1]">
            Controle que{" "}
            <em className="font-serif-italic text-[1.2em] font-normal italic leading-none text-primary">
              cabe
            </em>{" "}
            no bolso — literalmente
          </h2>
          <p className="mt-3 max-w-xl text-base leading-relaxed text-muted-foreground md:text-lg">
            Se vocês sabem mandar WhatsApp, já sabem usar HiveBudget. Zero curva de aprendizado.
          </p>

          <ul className="mt-7 flex flex-col gap-3.5">
            {BULLETS.map((bullet, i) => (
              <li key={i} className="flex items-start gap-3 text-[15px] leading-snug">
                <span className="cartoon-chrome mt-px flex size-7 shrink-0 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
                  <Check className="size-3.5" strokeWidth={3} />
                </span>
                {bullet.text}
              </li>
            ))}
          </ul>

          <Button size="lg" variant="secondary" className="mt-7" asChild>
            <Link href={appConfig.waitlistMode ? "/beta" : "#pricing"}>
              Quero experimentar
              <ArrowRight className="ml-1 size-4" />
            </Link>
          </Button>
        </div>

        {/* Chat preview */}
        <div className="cartoon-panel-strong relative rounded-[22px] bg-card p-5">
          <span className="font-hand cartoon-chrome-wobble pointer-events-none absolute -right-3 -top-4 z-10 rotate-3 rounded-2xl rounded-bl-sm border-[1.5px] border-ink bg-card px-3 py-1.5 text-lg font-bold text-primary shadow-cartoon-sm">
            viu? fácil.
          </span>
          <div className="mb-3 flex items-center gap-2.5 border-b-[1.5px] border-border px-1 pb-3 pt-1">
            <div className="flex size-9 items-center justify-center rounded-full border-[1.5px] border-ink bg-primary text-xs font-extrabold text-primary-foreground">
              HB
            </div>
            <div className="flex-1">
              <div className="text-sm font-bold">HiveBudget Bot</div>
              <div className="flex items-center gap-1.5 text-[11px] text-(--success)">
                <span className="size-1.5 rounded-full bg-(--success)" />
                WhatsApp · para vocês dois
              </div>
            </div>
          </div>

          <Bubble side="me">📎 comprovante-pix.jpg</Bubble>
          <Bubble side="bot">
            <b className="text-(--brand-violet-700)">✅ Registrado!</b>
            <br />
            Mercado Extra · R$ 127,50
            <br />
            Categoria: Alimentação (Maria pagou)
          </Bubble>
          <Bubble side="me">quanto gastamos com mercado?</Bubble>
          <Bubble side="bot">
            Em outubro, vocês gastaram <b className="text-(--brand-violet-700)">R$ 611</b> em 4
            compras. Maior: Mercado Extra · R$ 127,50 🛒
          </Bubble>
          <Bubble side="me">🎤 áudio (0:06)</Bubble>
          <Bubble side="bot">
            <b className="text-(--brand-violet-700)">✅ Registrado!</b>
            <br />
            &ldquo;uber pro aeroporto&rdquo; · Transporte · R$ 62
          </Bubble>
        </div>
      </div>
    </section>
  );
}

function Bubble({
  side,
  children,
}: {
  side: "me" | "bot";
  children: React.ReactNode;
}) {
  if (side === "me") {
    return (
      <div className="my-1.5 ml-auto max-w-[85%] rounded-2xl rounded-br-sm bg-[oklch(0.93_0.06_150)] px-3.5 py-2.5 text-sm leading-snug text-[oklch(0.28_0.1_150)]">
        {children}
      </div>
    );
  }
  return (
    <div className="my-1.5 max-w-[85%] rounded-2xl rounded-bl-sm bg-muted px-3.5 py-2.5 text-sm leading-snug text-foreground">
      {children}
    </div>
  );
}
